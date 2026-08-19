import crypto from "node:crypto";
import { airports } from "@nwpr/airport-codes";
import type {
  PaymentGatewayAdapter,
  CreatePaymentLinkParams,
  CreatePaymentLinkTravelData,
  CreatePaymentLinkFlightTravelData,
  CreatePaymentLinkRailTravelData,
  CreatePaymentLinkHotelTravelData,
  CreatePaymentLinkCarTravelData,
  CreatePaymentLinkResult,
  RiskEngineSubmissionParams,
  RiskEngineSubmissionResult,
  PaymentWebhookPayload,
  RefundPaymentParams,
  RefundPaymentResult,
  PaymentStatusResult,
} from "./PaymentGatewayAdapter";
import { initiatePayCollect, refundPayment as refundPaymentApi, getPaymentStatus as getPaymentStatusApi } from "./payglocal/client";
import { verifyCallbackToken } from "./payglocal/jwt";

const SUCCESS_STATUSES = new Set(["SUCCESS", "CAPTURED", "SETTLED", "SENT_FOR_CAPTURE"]);
const FAILED_STATUSES = new Set(["FAILED", "DECLINED", "CANCELLED", "REJECTED", "NOT_CAPTURED"]);

const IATA_CODES = new Set(
  airports.flatMap((airport) => (airport.iata ? [airport.iata.toUpperCase()] : []))
);
const IATA_BY_AIRPORT_NAME = new Map(
  airports.flatMap((airport) =>
    airport.iata && airport.name ? [[airport.name.trim().toLowerCase(), airport.iata.toUpperCase()] as const] : []
  )
);

function normalizeStatus(raw: string): "success" | "failed" | "pending" {
  const upper = raw.toUpperCase();
  if (SUCCESS_STATUSES.has(upper)) return "success";
  if (FAILED_STATUSES.has(upper)) return "failed";
  return "pending";
}

// Verified directly against PayGlocal's UAT API: ONEWAY and RETURN are accepted; ROUNDTRIP,
// ROUND_TRIP, TWOWAY, TWO_WAY, RT and several MULTICITY spellings all get a generic 400.
// No confirmed value exists yet for Multi City, so it falls back to ONEWAY below.
const JOURNEY_TYPE_MAP: Record<string, string> = {
  "One Way": "ONEWAY",
  "Round Trip": "RETURN",
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || fullName;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
  return { firstName, lastName };
}

/** PayGlocal has no separate middle-name field, so preserve it in firstName instead of dropping it. */
function payGlocalPassengerName(passenger: { firstName: string; middleName?: string | null; lastName: string }) {
  return {
    firstName: [passenger.firstName, passenger.middleName].filter(Boolean).join(" "),
    lastName: passenger.lastName,
  };
}

/**
 * Booking rows created through older/manual forms may contain an airport's display name instead
 * of its three-letter IATA code. PayGlocal strictly validates these two fields, so resolve common
 * display formats and fail locally with a useful error when no unambiguous code can be found.
 */
function payGlocalAirportCode(value: string, field: "departureAirportCode" | "arrivalAirportCode"): string {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (IATA_CODES.has(upper)) return upper;

  const embeddedCodes = Array.from(upper.matchAll(/(?:^|[^A-Z])([A-Z]{3})(?=$|[^A-Z])/g), (match) => match[1]);
  const embeddedIata = embeddedCodes.find((code) => IATA_CODES.has(code));
  if (embeddedIata) return embeddedIata;

  const nameMatch = IATA_BY_AIRPORT_NAME.get(trimmed.toLowerCase());
  if (nameMatch) return nameMatch;

  throw new Error(`${field} must contain a valid 3-letter IATA airport code; received "${value}"`);
}

function formatReservationDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** PayGlocal's lodgingData check-in/check-out want the same compact YYYYMMDD as reservationDate. */
function formatCompactDate(date: string): string {
  return date.slice(0, 10).replace(/-/g, "");
}

/** Trims the milliseconds JS adds, matching the `2023-03-20T09:01:56Z` form PayGlocal's cabData expects. */
function toIsoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * PayGlocal's async S2S webhook notification (e.g. SENT_FOR_CAPTURE/CAPTURED updates) posts a
 * plain JSON body, distinct from the browser redirect callback below which posts form-urlencoded
 * `x-gl-token=<jws>`. Confirmed from live callback payloads, the decoded+verified token looks like
 * `{gid, "x-gl-gid", merchantTxnId, merchantUniqueId, Amount, status, paymentMethod,
 * "x-gl-merchantId", statusUrl, iat, exp}` — note the capitalized `Amount`, and no `currency`,
 * `cardBrand`, `cardType`, or `country` at all (bookingService.handlePaymentWebhook falls back to
 * the PaymentLink's own amount/currency to cover the latter). The async JSON webhook's exact shape
 * is unconfirmed, so it's read as leniently (both casings). Detected here by the presence of `gid`
 * at the top level of a JSON body.
 */
function parseJsonWebhookBody(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === "object" && "gid" in parsed ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** PayGlocal's riskData rejects plain YYYY-MM-DD with INVALID_DATE — it wants a full ISO 8601 datetime. */
function toIsoDateTime(date: string, time: string | null): string {
  return `${date}T${time || "00:00"}:00Z`;
}

/**
 * Groups leg indices into routes for PayGlocal's routeId. ONEWAY (and Multi City, which falls
 * back to ONEWAY) is a single route. RETURN splits into outbound (route "1") and inbound
 * (route "2") by watching for the leg that lands at the itinerary's final destination — every
 * leg up to and including that one is outbound, everything after is the return route. There's
 * no explicit outbound/return flag in flight_segments, so this is inferred rather than stored.
 */
function assignRouteIds(
  legs: CreatePaymentLinkFlightTravelData["legs"],
  journeyType: string,
  destination: string
): number[] {
  if (journeyType !== "RETURN" || !destination) {
    return legs.map(() => 1);
  }
  let dest = destination.trim().toUpperCase();
  try {
    dest = payGlocalAirportCode(destination, "arrivalAirportCode");
  } catch {
    // The final destination is only a route-grouping hint. Individual legs are validated below.
  }
  let route = 1;
  return legs.map((leg) => {
    const current = route;
    let arrival = leg.arrAirport?.trim().toUpperCase();
    try {
      arrival = payGlocalAirportCode(leg.arrAirport, "arrivalAirportCode");
    } catch {
      // Keep grouping best-effort; payload construction below returns the actionable error.
    }
    if (route === 1 && arrival === dest) {
      route = 2;
    }
    return current;
  });
}

/** Maps our vendor-neutral CreatePaymentLinkParams onto PayGlocal's `riskData.flightData` shape. */
function buildFlightRiskData(travel: CreatePaymentLinkFlightTravelData) {
  const journeyType = JOURNEY_TYPE_MAP[travel.tripType] || "ONEWAY";
  const routeIds = assignRouteIds(travel.legs, journeyType, travel.destination);
  const legIdCounters: Record<number, number> = {};


  return {
    flightData: [
      {
        journeyType,
        ticketNumber: travel.pnr,
        reservationDate: formatReservationDate(travel.reservationDate),
        legData: travel.legs.map((leg, i) => {
          const routeId = routeIds[i];
          legIdCounters[routeId] = (legIdCounters[routeId] || 0) + 1;
          return {
            routeId: String(routeId),
            legId: String(legIdCounters[routeId]),
            flightNumber: leg.flightNumber || "",
            departureAirportCode: payGlocalAirportCode(leg.depAirport, "departureAirportCode"),
            departureCity: leg.depCity || "",
            departureCountry: leg.depCountry || "",
            departureDate: toIsoDateTime(leg.depDate, leg.depTime),
            arrivalAirportCode: payGlocalAirportCode(leg.arrAirport, "arrivalAirportCode"),
            arrivalCity: leg.arrCity || "",
            arrivalCountry: leg.arrCountry || "",
            arrivalDate: toIsoDateTime(leg.arrDate || leg.depDate, leg.arrTime ?? leg.depTime),
            carrierCode: leg.airline,
            airlineServiceClass: (leg.cabinClass || "ECONOMY").toUpperCase(),
          };
        }),
        passengerData: travel.passengers.map(payGlocalPassengerName),
      },
    ],
  };
}

function payGlocalStationCode(value: string, field: string): string {
  const trimmed = value.trim().toUpperCase();
  const embedded = trimmed.match(/(?:^|[^A-Z0-9])([A-Z0-9]{2,5})(?=$|[^A-Z0-9])/);
  const code = /^[A-Z0-9]{2,5}$/.test(trimmed) ? trimmed : embedded?.[1];
  if (!code) {
    throw new Error(`${field} must contain a 2-5 character rail station code; received "${value}"`);
  }
  return code;
}

/** Maps rail bookings separately so station codes are never sent as airport codes. */
function buildRailRiskData(travel: CreatePaymentLinkRailTravelData) {
  return {
    railData: [
      {
        reservationNumber: travel.reservationNumber,
        reservationDate: formatReservationDate(travel.reservationDate),
        operator: travel.operator,
        legData: travel.legs.map((leg, index) => ({
          routeId: "1",
          legId: String(index + 1),
          ...(leg.trainNumber ? { trainNumber: leg.trainNumber } : {}),
          departureStationCode: payGlocalStationCode(leg.departureStationCode, "departureStationCode"),
          ...(leg.departureCity ? { departureCity: leg.departureCity } : {}),
          ...(leg.departureCountry ? { departureCountry: leg.departureCountry } : {}),
          departureDate: toIsoDateTime(leg.departureDate, leg.departureTime),
          arrivalStationCode: payGlocalStationCode(leg.arrivalStationCode, "arrivalStationCode"),
          ...(leg.arrivalCity ? { arrivalCity: leg.arrivalCity } : {}),
          ...(leg.arrivalCountry ? { arrivalCountry: leg.arrivalCountry } : {}),
          arrivalDate: toIsoDateTime(
            leg.arrivalDate || leg.departureDate,
            leg.arrivalTime ?? leg.departureTime
          ),
          ...(leg.serviceClass ? { serviceClass: leg.serviceClass.toUpperCase() } : {}),
        })),
        passengerData: travel.passengers.map(payGlocalPassengerName),
      },
    ],
  };
}

/**
 * Maps a hotel booking onto PayGlocal's `riskData.lodgingData` shape. `lodgingType` is the constant
 * "Hotel" — the booking type already implies it, so nothing stores it. Optional fields are omitted
 * rather than sent empty, since bookings created before city/country/cancellationPolicy existed
 * (see migration 20260101000056) have them null.
 */
function buildLodgingRiskData(travel: CreatePaymentLinkHotelTravelData) {
  // Stored as DECIMAL(2,1) so a 4-star hotel reads back as "4.0"; PayGlocal's sample uses "4".
  const rating = travel.rating != null && travel.rating !== "" ? String(Number(travel.rating)) : null;

  return {
    lodgingData: [
      {
        checkInDate: formatCompactDate(travel.checkInDate),
        checkOutDate: formatCompactDate(travel.checkOutDate),
        ...(travel.city ? { city: travel.city } : {}),
        ...(travel.country ? { country: travel.country } : {}),
        lodgingType: "Hotel",
        lodgingName: travel.lodgingName,
        ...(rating ? { rating } : {}),
        ...(travel.cancellationPolicy ? { cancellationPolicy: travel.cancellationPolicy } : {}),
      },
    ],
  };
}

/**
 * Maps a car booking onto PayGlocal's `riskData.cabData` shape. A car booking is a single pickup,
 * so it's always one route with one leg — the routeId/legId grouping that matters for multi-leg
 * flights has no equivalent here. PayGlocal's sample carries only `pickupDate` in legData, so the
 * dropoff datetime and pickup/dropoff locations we store aren't sent.
 */
function buildCabRiskData(travel: CreatePaymentLinkCarTravelData) {
  return {
    cabData: [
      {
        legData: [{ routeId: "1", legId: "1", pickupDate: toIsoSeconds(travel.pickupDateTime) }],
        passengerData: travel.passengers.map(payGlocalPassengerName),
      },
    ],
  };
}

/** Returns null when the booking carries no usable risk data, so `riskData` is left off entirely. */
function buildRiskData(travel: CreatePaymentLinkTravelData): Record<string, unknown> | null {
  switch (travel.type) {
    case "flight":
      return travel.legs.length > 0 ? buildFlightRiskData(travel) : null;
    case "rail":
      return travel.legs.length > 0 ? buildRailRiskData(travel) : null;
    case "hotel":
      return buildLodgingRiskData(travel);
    case "car":
      return buildCabRiskData(travel);
    default:
      return null;
  }
}

/**
 * PayGlocal integration. `PAYGLOCAL_MODE=mock` (default) keeps the local mock-pay flow working
 * without credentials; `PAYGLOCAL_MODE=live` calls the real PayGlocal UAT/prod API (see
 * lib/payments/payglocal/*), which requires PG_MERCHANT_ID + the two PEM keys under keys/payglocal/.
 */
export class PayGlocalAdapter implements PaymentGatewayAdapter {
  private readonly mode: "mock" | "live";
  private readonly webhookSecret: string;

  constructor() {
    this.mode = process.env.PAYGLOCAL_MODE === "live" ? "live" : "mock";
    this.webhookSecret = process.env.PAYGLOCAL_WEBHOOK_SECRET || "dev-webhook-secret";
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult> {
    if (this.mode !== "live") {
      const gatewayLinkId = `MOCK-LINK-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
      const linkUrl = `${baseUrl}/mock-pay/${gatewayLinkId}?amount=${params.amount}&currency=${params.currency}&ref=${encodeURIComponent(params.bookingRef)}`;
      return { gatewayLinkId, linkUrl };
    }

    const merchantUniqueId = `${params.bookingRef}-${Date.now()}`.slice(0, 40);
    const { firstName, lastName } = splitName(params.customerName);
    const address = params.billingAddress;
    const riskData = params.travel ? buildRiskData(params.travel) : null;

    const response = await initiatePayCollect({
      merchantTxnId: params.bookingRef,
      merchantUniqueId,
      totalAmount: params.amount.toFixed(2),
      txnCurrency: params.currency,
      billingData: {
        firstName,
        lastName,
        emailId: params.customerEmail,
        ...(address?.street1 ? { addressStreet1: address.street1 } : {}),
        ...(address?.city ? { addressCity: address.city } : {}),
        ...(address?.state ? { addressState: address.state } : {}),
        ...(address?.country ? { addressCountry: address.country } : {}),
      },
      // riskData.billingData is a sibling of flightData/lodgingData/cabData, so the same email
      // enrichment rides along with every booking type.
      ...(riskData ? { riskData: { billingData: { emailId: params.customerEmail }, ...riskData } } : {}),
    });

    if (!response.data?.redirectUrl) {
      throw new Error(response.message || "PayGlocal did not return a redirect URL");
    }

    return { gatewayLinkId: response.gid, linkUrl: response.data.redirectUrl };
  }

  async submitToRiskEngine(params: RiskEngineSubmissionParams): Promise<RiskEngineSubmissionResult> {
    if (this.mode === "live") {
      throw new Error(
        "PayGlocal Risk Engine live mode is not implemented yet — its API contract has not been supplied."
      );
    }

    // Mock: always "approved". Real implementation posts `params` (or a mapped subset)
    // to PayGlocal's Risk Engine endpoint and returns its response here.
    return {
      status: "approved",
      raw: { mock: true, bookingRef: params.bookingRef, evaluatedAt: new Date().toISOString() },
    };
  }

  /** PayGlocal posts `x-gl-token=<jws>` as an application/x-www-form-urlencoded body to merchantCallbackURL. */
  private extractCallbackToken(rawBody: string): string | null {
    try {
      return new URLSearchParams(rawBody).get("x-gl-token");
    } catch {
      return null;
    }
  }

  async verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
    if (this.mode !== "live") {
      if (!signatureHeader) return false;
      const expected = crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
      } catch {
        return false;
      }
    }

    // PayGlocal's async S2S webhook isn't covered by any doc/sandbox output we've seen yet, so
    // this assumes it signs the same way as the redirect callback (an x-gl-token JWS verifiable
    // with PayGlocal's public cert) but carries the token in a header instead of the body, since
    // the body here is the plain JSON payload itself, not a form field. CONFIRM against
    // PayGlocal's docs/sandbox before relying on this in production.
    if (parseJsonWebhookBody(rawBody)) {
      if (!signatureHeader) return false;
      try {
        await verifyCallbackToken(signatureHeader);
        return true;
      } catch {
        return false;
      }
    }

    const token = this.extractCallbackToken(rawBody);
    if (!token) return false;
    try {
      await verifyCallbackToken(token);
      return true;
    } catch {
      return false;
    }
  }

  async parseWebhookPayload(rawBody: string): Promise<PaymentWebhookPayload> {
    if (this.mode !== "live") {
      const parsed = JSON.parse(rawBody);
      return {
        gatewayLinkId: parsed.gatewayLinkId,
        transactionId: parsed.transactionId,
        gatewayReferenceNumber: parsed.gatewayReferenceNumber,
        amountPaid: Number(parsed.amountPaid),
        currency: parsed.currency,
        paymentMethod: parsed.paymentMethod,
        paidAt: parsed.paidAt,
        status: parsed.status === "success" ? "success" : "failed",
      };
    }

    const jsonBody = parseJsonWebhookBody(rawBody);
    if (jsonBody) {
      const gid = String(jsonBody.gid ?? "");
      if (!gid) throw new Error("PayGlocal webhook did not include a gid");
      const cardDetail = [jsonBody.cardBrand, jsonBody.cardType].filter(Boolean).join(" ");
      const method = String(jsonBody.paymentMethod ?? "unknown");
      return {
        gatewayLinkId: gid,
        transactionId: gid,
        gatewayReferenceNumber: String(jsonBody.merchantTxnId ?? gid),
        // PayGlocal sends the amount as capitalized `Amount` (confirmed from live webhook
        // payloads), not `amount` as this webhook's docs imply — keep the lowercase fallback in
        // case a differently-shaped event ever sends it that way instead.
        amountPaid: Number(jsonBody.Amount ?? jsonBody.amount ?? 0),
        currency: String(jsonBody.Currency ?? jsonBody.currency ?? ""),
        paymentMethod: cardDetail ? `${method} (${cardDetail})` : method,
        // Not included in this webhook's payload — recorded as the time we received it.
        paidAt: new Date().toISOString(),
        status: normalizeStatus(String(jsonBody.status ?? "")),
        raw: jsonBody,
      };
    }

    const token = this.extractCallbackToken(rawBody);
    if (!token) throw new Error("Missing x-gl-token in PayGlocal callback");
    const callback = await verifyCallbackToken(token);
    const gid = String(callback.gid ?? "");
    if (!gid) throw new Error("PayGlocal callback did not include a gid");

    const cardDetail = [callback.cardBrand, callback.cardType].filter(Boolean).join(" ");
    const method = String(callback.paymentMethod ?? "unknown");

    return {
      gatewayLinkId: gid,
      transactionId: gid,
      gatewayReferenceNumber: String(callback.merchantTxnId ?? gid),
      // Confirmed from live callback payloads: PayGlocal sends `Amount` (capitalized), and
      // doesn't include `currency`/`cardBrand`/`cardType`/`country` in this token at all.
      amountPaid: Number(callback.Amount ?? callback.amount ?? 0),
      currency: String(callback.Currency ?? callback.currency ?? ""),
      paymentMethod: cardDetail ? `${method} (${cardDetail})` : method,
      // Not included in this callback's payload — recorded as the time we received it.
      paidAt: new Date().toISOString(),
      status: normalizeStatus(String(callback.status ?? "")),
      raw: callback,
    };
  }

  async refundPayment(
    gatewayLinkId: string,
    merchantTxnId: string,
    params: RefundPaymentParams
  ): Promise<RefundPaymentResult> {
    if (this.mode !== "live") {
      return {
        status: "SENT_FOR_REFUND",
        raw: { mock: true, gatewayLinkId, merchantTxnId, ...params, refundedAt: new Date().toISOString() },
      };
    }

    const response = await refundPaymentApi(gatewayLinkId, {
      merchantTxnId,
      merchantUniqueId: `${merchantTxnId}-RF-${Date.now()}`.slice(0, 40),
      refundType: params.refundType === "partial" ? "P" : "F",
      ...(params.refundType === "partial" && params.amount != null ? { totalAmount: params.amount.toFixed(2) } : {}),
    });

    return { status: response.status, raw: response as unknown as Record<string, unknown> };
  }

  async getPaymentStatus(gatewayLinkId: string): Promise<PaymentStatusResult> {
    if (this.mode !== "live") {
      return { status: "unknown", amountPaid: null, currency: null, paidAt: null, raw: { mock: true, gatewayLinkId } };
    }

    const response = await getPaymentStatusApi(gatewayLinkId);
    const data = response.data ?? {};
    return {
      status: String(data.status ?? response.status ?? ""),
      amountPaid: data.Amount != null ? Number(data.Amount) : null,
      currency: data.Currency ?? null,
      paidAt: data.transactionCreationTime ?? null,
      raw: response as unknown as Record<string, unknown>,
    };
  }

  /** Only used by the local mock-pay page to produce a validly signed webhook call. */
  signPayload(rawBody: string): string {
    return crypto.createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
  }
}

export const paymentGateway: PaymentGatewayAdapter & { signPayload?(rawBody: string): string } =
  new PayGlocalAdapter();

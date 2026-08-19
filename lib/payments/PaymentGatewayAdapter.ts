export interface CreatePaymentLinkBillingAddress {
  street1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface CreatePaymentLinkTravelLeg {
  flightNumber: string | null;
  airline: string;
  depAirport: string;
  depCity: string | null;
  depCountry: string | null;
  depDate: string;
  depTime: string | null;
  arrAirport: string;
  arrCity: string | null;
  arrCountry: string | null;
  arrDate: string | null;
  arrTime: string | null;
  cabinClass: string | null;
}

export interface CreatePaymentLinkFlightTravelData {
  type: "flight";
  /** "One Way" | "Round Trip" | "Multi City" — mapped to the gateway's own enum by the adapter. */
  tripType: string;
  /** Date the booking was made, used as the risk engine's reservation date. */
  reservationDate: Date;
  /** Itinerary PNR — sent as the risk engine's ticketNumber since e-ticket numbers aren't issued yet at payment-link time. */
  pnr: string;
  /** Final destination airport code — used to split legs into outbound/return route groups for Round Trip. */
  destination: string;
  legs: CreatePaymentLinkTravelLeg[];
  passengers: Array<{ firstName: string; middleName?: string | null; lastName: string }>;
}

export interface CreatePaymentLinkRailTravelData {
  type: "rail";
  reservationDate: Date;
  reservationNumber: string;
  operator: string;
  legs: Array<{
    trainNumber: string | null;
    departureStationCode: string;
    departureCity: string | null;
    departureCountry: string | null;
    departureDate: string;
    departureTime: string | null;
    arrivalStationCode: string;
    arrivalCity: string | null;
    arrivalCountry: string | null;
    arrivalDate: string | null;
    arrivalTime: string | null;
    serviceClass: string | null;
  }>;
  passengers: Array<{ firstName: string; middleName?: string | null; lastName: string }>;
}

export interface CreatePaymentLinkHotelTravelData {
  type: "hotel";
  lodgingName: string;
  /** YYYY-MM-DD; the adapter reformats these for the gateway. */
  checkInDate: string;
  checkOutDate: string;
  /** The hotel's own city/country (ISO code), not the payer's billing address. */
  city: string | null;
  country: string | null;
  /** Star rating as stored (e.g. "4.0"); the adapter normalises it. */
  rating: string | null;
  /** Gateway-specific policy code, e.g. "NC" — omitted from the payload when unset. */
  cancellationPolicy: string | null;
}

export interface CreatePaymentLinkCarTravelData {
  type: "car";
  pickupDateTime: Date;
  /** Driver list; falls back to the booking contact when no drivers were captured. */
  passengers: Array<{ firstName: string; middleName?: string | null; lastName: string }>;
}

/** Discriminated by booking type — each variant maps to a different gateway risk-data shape. */
export type CreatePaymentLinkTravelData =
  | CreatePaymentLinkFlightTravelData
  | CreatePaymentLinkRailTravelData
  | CreatePaymentLinkHotelTravelData
  | CreatePaymentLinkCarTravelData;

export interface CreatePaymentLinkParams {
  bookingRef: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: CreatePaymentLinkBillingAddress;
  /** Omitted for booking types the gateway has no risk-data shape for (train/cruise) — those just skip risk enrichment. */
  travel?: CreatePaymentLinkTravelData;
}

export interface CreatePaymentLinkResult {
  gatewayLinkId: string;
  linkUrl: string;
}

export interface RiskEngineSubmissionParams {
  bookingRef: string;
  amount: number;
  currency: string;
  customer: { name: string; email: string; phone?: string | null };
  passengers: Array<{ name: string; dob?: string | null; passportNo?: string | null }>;
  travel: Record<string, unknown>;
}

export interface RiskEngineSubmissionResult {
  status: string;
  raw: Record<string, unknown>;
}

export interface PaymentWebhookPayload {
  gatewayLinkId: string;
  transactionId: string;
  gatewayReferenceNumber: string;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  /** "pending" covers non-terminal gateway statuses (e.g. still authorizing) — no booking state change yet. */
  status: "success" | "failed" | "pending";
  /** Full raw gateway payload, for fields the vendor-neutral shape above doesn't cover (e.g. PayGlocal's country/cardBrand/cardType). */
  raw?: Record<string, unknown>;
}

export interface RefundPaymentParams {
  refundType: "partial" | "full";
  /** Required for a partial refund; ignored for a full refund. */
  amount?: number;
}

export interface RefundPaymentResult {
  status: string;
  raw: Record<string, unknown>;
}

export interface PaymentStatusResult {
  status: string;
  amountPaid: number | null;
  currency: string | null;
  paidAt: string | null;
  raw: Record<string, unknown>;
}

/**
 * Boundary the PRD calls for explicitly ("configurable integrations, avoid hardcoding").
 * Swapping the mocked PayGlocalAdapter for the real API contract only touches its
 * implementation file, never callers of this interface.
 */
export interface PaymentGatewayAdapter {
  createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResult>;
  submitToRiskEngine(params: RiskEngineSubmissionParams): Promise<RiskEngineSubmissionResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean>;
  parseWebhookPayload(rawBody: string): Promise<PaymentWebhookPayload>;
  refundPayment(gatewayLinkId: string, merchantTxnId: string, params: RefundPaymentParams): Promise<RefundPaymentResult>;
  getPaymentStatus(gatewayLinkId: string): Promise<PaymentStatusResult>;
}

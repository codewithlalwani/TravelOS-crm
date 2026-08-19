"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { paymentGateway } from "@/lib/payments/PayGlocalAdapter";
import type {
  CreatePaymentLinkParams,
  CreatePaymentLinkTravelData,
  CreatePaymentLinkFlightTravelData,
  CreatePaymentLinkHotelTravelData,
  CreatePaymentLinkCarTravelData,
} from "@/lib/payments/PaymentGatewayAdapter";

export interface PayGlocalTestState {
  status: "idle" | "success" | "error";
  message?: string;
  result?: { gatewayLinkId: string; linkUrl: string };
}

export const initialPayGlocalTestState: PayGlocalTestState = { status: "idle" };

async function requirePayGlocalTestAccess() {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "bookings.payment")) throw new Error("Not authorized");
}

/** Raw JSON body from the test form — travel's date fields arrive as strings, not Dates. */
type TestTravel =
  | (Omit<CreatePaymentLinkFlightTravelData, "reservationDate"> & { reservationDate: string })
  | CreatePaymentLinkHotelTravelData
  | (Omit<CreatePaymentLinkCarTravelData, "pickupDateTime"> & { pickupDateTime: string });

type TestPayload = Omit<CreatePaymentLinkParams, "travel"> & { travel?: TestTravel };

function reviveTravelDates(travel: TestTravel | undefined): CreatePaymentLinkTravelData | undefined {
  if (!travel) return undefined;
  if (travel.type === "flight") return { ...travel, reservationDate: new Date(travel.reservationDate) };
  if (travel.type === "car") return { ...travel, pickupDateTime: new Date(travel.pickupDateTime) };
  return travel;
}

export async function testPayGlocalPaymentAction(
  _prevState: PayGlocalTestState,
  formData: FormData
): Promise<PayGlocalTestState> {
  await requirePayGlocalTestAccess();

  const raw = String(formData.get("payload") || "");
  let parsed: TestPayload;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { status: "error", message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!parsed.bookingRef || typeof parsed.amount !== "number" || !parsed.customerEmail) {
    return { status: "error", message: "Payload must include at least bookingRef, amount and customerEmail" };
  }

  const params: CreatePaymentLinkParams = {
    ...parsed,
    // PayGlocal rejects a reused merchantTxnId, so every test run needs a fresh one.
    bookingRef: `${parsed.bookingRef}-${Date.now()}`.slice(0, 40),
    travel: reviveTravelDates(parsed.travel),
  };

  try {
    const result = await paymentGateway.createPaymentLink(params);
    return { status: "success", result };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

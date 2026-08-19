import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { createPaymentLinkAndSubmitRisk } from "@/services/bookingService";
import { buildShortPayUrl } from "@/lib/payments/shortLink";

/**
 * Next.js equivalent of the legacy POST /api/payments/create-link.php PayCollect flow:
 * saves the order, calls PayGlocal, stores the redirect URL, and returns a short link
 * that can be shared with the customer instead of the raw gateway URL.
 *
 * Body: { bookingId, amount, currency }
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!session || !can(perms, "bookings.payment")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bookingId?: number; amount?: number; currency?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingId = Number(body.bookingId);
  const amount = Number(body.amount);
  const currency = String(body.currency || "USD").toUpperCase();

  if (!bookingId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "bookingId and a positive amount are required" }, { status: 400 });
  }

  try {
    const { paymentLink } = await createPaymentLinkAndSubmitRisk(bookingId, amount, currency, session.userId);

    return NextResponse.json({
      success: true,
      record_id: paymentLink.id,
      short_code: paymentLink.shortCode,
      short_url: paymentLink.shortCode ? buildShortPayUrl(paymentLink.shortCode) : null,
      payment_url: paymentLink.linkUrl,
      pg_gid: paymentLink.gatewayLinkId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate payment link";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

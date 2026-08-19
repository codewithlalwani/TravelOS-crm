import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { handlePaymentWebhook } from "@/services/bookingService";

// This endpoint doubles as PayGlocal's merchantCallbackURL, which the customer's own browser is
// redirected to after a hosted-page payment — it must respond with an HTTP redirect to a result
// page, not JSON. In production this callback has been observed arriving as a GET with
// `x-gl-token` in the query string (see the GET handler below), not the POST + form-urlencoded
// body PayGlocal's docs describe, so both are handled the same way here.
// `request.url` reflects whatever host/port Next.js actually receives the request on, which in
// prod is the app's internal bind address behind the reverse proxy (not the public domain) unless
// the proxy's forwarded headers are trusted — so redirects back to the customer's browser must be
// anchored on APP_BASE_URL instead.
function appBaseUrl(request: NextRequest): string {
  return process.env.APP_BASE_URL || request.url;
}

async function respondToBrowserCallback(rawBody: string, signature: string | null, request: NextRequest) {
  try {
    const { booking, payment, paymentLink } = await handlePaymentWebhook(rawBody, signature);
    const destination = payment.status === "success" ? "/pay/success" : "/pay/failure";
    const params = new URLSearchParams({ txnId: booking.bookingRef });
    if (paymentLink.gatewayLinkId) params.set("gid", paymentLink.gatewayLinkId);
    // PayGlocal's redirect-callback token doesn't reliably echo back amount/currency in the
    // UAT sandbox (despite its docs listing them) — fall back to what we actually requested
    // on the payment link itself rather than displaying a bogus 0.00.
    const amount = Number(payment.amountPaid) || Number(paymentLink.amount);
    const currency = payment.currency || paymentLink.currency;
    if (amount) params.set("amount", amount.toFixed(2));
    if (currency) params.set("currency", currency);
    // 303 forces the browser to GET the destination — the default 307 would re-POST to it.
    return NextResponse.redirect(new URL(`${destination}?${params.toString()}`, appBaseUrl(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/pay/failure", appBaseUrl(request)), 303);
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("x-gl-token");
  if (!token) {
    return NextResponse.redirect(new URL("/pay/failure", appBaseUrl(request)), 303);
  }
  // Rebuild the token into the form-urlencoded shape verifyWebhookSignature/parseWebhookPayload
  // expect from the body, since it arrived in the query string instead.
  const rawBody = new URLSearchParams({ "x-gl-token": token }).toString();
  return respondToBrowserCallback(rawBody, token, request);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // The async S2S JSON webhook (SENT_FOR_CAPTURE etc.) posts application/json and expects the
  // JSON ack below, instead of a browser redirect.
  const contentType = request.headers.get("content-type") || "";
  const isBrowserCallback = contentType.includes("application/x-www-form-urlencoded");

  if (isBrowserCallback) {
    const signature = request.headers.get("x-gl-token") || request.headers.get("x-payglocal-signature");
    return respondToBrowserCallback(rawBody, signature, request);
  }

  // Mock/redirect-callback verification uses x-payglocal-signature; the async S2S JSON webhook
  // (SENT_FOR_CAPTURE etc.) is assumed to carry its signature as x-gl-token instead — see the
  // caveat in PayGlocalAdapter.verifyWebhookSignature.
  const signature = request.headers.get("x-gl-token") || request.headers.get("x-payglocal-signature");

  // PayGlocal requires an immediate HTTP 200 ack from this webhook and doesn't tolerate a slow
  // or non-200 response — so ack first, then verify the signature and persist the payment in
  // the background via `after()` rather than making PayGlocal wait on it (or retry on failure).
  after(async () => {
    try {
      await handlePaymentWebhook(rawBody, signature);
    } catch (err) {
      console.error("PayGlocal webhook processing failed:", err);
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

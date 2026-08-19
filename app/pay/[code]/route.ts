import { NextResponse } from "next/server";
import { PaymentLink } from "@/models/PaymentLink";

/** Public short link customers click — resolves to PayGlocal's hosted payment page. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const paymentLink = await PaymentLink.findOne({ where: { shortCode: code } });

  if (!paymentLink || !paymentLink.linkUrl) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
  if (paymentLink.status === "expired" || paymentLink.status === "cancelled") {
    return NextResponse.json({ error: "This payment link is no longer valid" }, { status: 410 });
  }

  return NextResponse.redirect(paymentLink.linkUrl);
}

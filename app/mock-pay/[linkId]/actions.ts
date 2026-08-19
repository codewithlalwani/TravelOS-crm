"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { paymentGateway } from "@/lib/payments/PayGlocalAdapter";

export async function simulatePayment(formData: FormData) {
  const gatewayLinkId = String(formData.get("gatewayLinkId") || "");
  const amount = Number(formData.get("amount") || 0);
  const currency = String(formData.get("currency") || "USD");

  const payload = {
    gatewayLinkId,
    transactionId: `TXN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
    gatewayReferenceNumber: `REF-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
    amountPaid: amount,
    currency,
    paymentMethod: "card",
    paidAt: new Date().toISOString(),
    status: "success" as const,
  };

  const rawBody = JSON.stringify(payload);
  const signature = paymentGateway.signPayload?.(rawBody) ?? "";
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const response = await fetch(`${baseUrl}/api/payglocal/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-payglocal-signature": signature },
    body: rawBody,
  });

  if (!response.ok) {
    redirect(`/mock-pay/${gatewayLinkId}?amount=${amount}&currency=${currency}&error=1`);
  }

  redirect(`/mock-pay/${gatewayLinkId}?amount=${amount}&currency=${currency}&paid=1`);
}

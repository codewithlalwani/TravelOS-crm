import type { Booking } from "@/models/Booking";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SendEmailButton } from "@/components/SendEmailButton";
import { FareBreakdownTable } from "@/components/FareBreakdownTable";
import { RefreshButton } from "@/components/RefreshButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { buildShortPayUrl } from "@/lib/payments/shortLink";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import { sendPaymentLinkAction, recordManualPaymentAction } from "../../actions";
import { CreatePaymentLinkForm } from "./CreatePaymentLinkForm";

export function PaymentTab({ booking, canManage }: { booking: Booking; canManage: boolean }) {
  const authorized = booking.ticketAuthorization?.status === "authorized";
  const paymentLinks = booking.paymentLinks || [];
  const payments = booking.payments || [];
  const risk = booking.riskEngineSubmissions || [];
  const fares = booking.fares || [];
  // Poll while any link is still awaiting a gateway outcome (status "created") or any payment
  // is still "pending". A link's own status flips to "used" once its webhook lands (see
  // bookingService.handlePaymentWebhook), so this naturally goes true again whenever a new link
  // is created for a follow-up charge — even after an earlier payment on this booking succeeded.
  const shouldPoll = paymentLinks.some((l) => l.status === "created") || payments.some((p) => p.status === "pending");
  const passengerCounts = (booking.passengers || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.paxType] = (acc[p.paxType] || 0) + 1;
    return acc;
  }, {});
  const latestLink = paymentLinks[0];
  const latestShareUrl = latestLink ? (latestLink.shortCode ? buildShortPayUrl(latestLink.shortCode) : latestLink.linkUrl) : null;

  return (
    <div className="space-y-6">
      <AutoRefresh enabled={shouldPoll} />
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Fare Breakdown</h3>
        <FareBreakdownTable fares={fares} passengerCounts={passengerCounts} currency={booking.currency} />
      </div>

      {!authorized && (
        <div className="rounded-2xl border border-warning/20 bg-warning-bg px-4 py-3 text-sm text-warning">
          Customer authorization is required before a payment link can be created.
        </div>
      )}

      {canManage ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">Create payment link</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Generates a PayGlocal payment link and automatically submits booking, customer, passenger and travel
            data to PayGlocal&apos;s Risk Engine.
          </p>
          <CreatePaymentLinkForm bookingId={booking.id} authorized={authorized} />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">Create payment link</h3>
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to create payment links.</p>
        </div>
      )}

      {latestLink && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Current payment link</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium text-foreground">
                {latestLink.currency} {Number(latestLink.amount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize text-foreground">{latestLink.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Link</dt>
              <dd className="truncate">
                <a href={latestShareUrl || "#"} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {latestShareUrl}
                </a>
              </dd>
            </div>
          </dl>
          {risk[0] && (
            <p className="mt-3 text-xs text-muted-foreground">
              Risk Engine: <span className="font-medium text-foreground">{risk[0].status}</span>{" "}
              {risk[0].submittedAt ? `(${risk[0].submittedAt.toLocaleString()})` : ""}
            </p>
          )}

          <div className="mt-4 border-t border-border pt-4">
            {latestLink.emailSentAt ? (
              <p className="text-xs font-medium text-success">
                Payment link emailed to customer {latestLink.emailSentAt.toLocaleString()}
              </p>
            ) : canManage ? (
              <form action={sendPaymentLinkAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <SendEmailButton
                  disabled={!latestLink.linkUrl}
                  confirmTitle="Send payment link to customer?"
                  confirmMessage="This will email the payment link to the recipients below."
                  defaultRecipients={booking.customer?.email ? [booking.customer.email] : []}
                  confirmLabel="Send Email"
                  pendingLabel="Sending…"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send Payment Link Email
                </SendEmailButton>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">You don&apos;t have permission to send payment links.</p>
            )}
          </div>
        </div>
      )}

      {canManage ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">Record manual payment</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Use this for payments received outside PayGlocal (cash, bank transfer, cheque, etc). The transaction ID
            is saved against the booking as proof of payment.
          </p>
          <form action={recordManualPaymentAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-card-foreground">Amount</label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-card-foreground">Currency</label>
              <select
                name="currency"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {BOOKING_CURRENCY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-card-foreground">Method</label>
              <select
                name="paymentMethod"
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Card (Manual)">Card (Manual)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-card-foreground">Transaction ID</label>
              <input
                name="transactionId"
                type="text"
                required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-card-foreground">Paid on</label>
              <input
                name="paidAt"
                type="date"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <label className="mb-1 block text-xs font-medium text-card-foreground">Reference number (Merchant Txn ID)</label>
              <input
                name="gatewayReferenceNumber"
                type="text"
                readOnly
                value={booking.bookingRef}
                className="w-full cursor-not-allowed rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <ConfirmSubmitButton
                confirmTitle="Record manual payment?"
                confirmMessage="This will mark the booking as paid and save the transaction ID against it."
                confirmLabel="Record Payment"
                pendingLabel="Recording…"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Record Manual Payment
              </ConfirmSubmitButton>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-card-foreground">Payments received</h3>
          <RefreshButton />
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet — payment status updates automatically once the customer pays.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Currency</th>
                  <th className="pb-2 pr-4 font-medium">Payment Method</th>
                  <th className="pb-2 pr-4 font-medium">GID</th>
                  <th className="pb-2 pr-4 font-medium">Merchant Txn ID</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const gw = p.gatewayResponse || {};
                  const field = (...keys: string[]) => {
                    for (const key of keys) {
                      const v = gw[key];
                      if (typeof v === "string" && v) return v;
                    }
                    return "—";
                  };
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2 pr-4 font-medium text-foreground">
                        {p.amountPaid ? Number(p.amountPaid).toFixed(2) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-foreground">{p.currency || field("currency")}</td>
                      <td className="py-2 pr-4 text-foreground">{p.paymentMethod || field("paymentMethod")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{p.transactionId || field("gid")}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {p.gatewayReferenceNumber || field("merchantTxnId")}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        <span className="capitalize">{p.status}</span>
                        {field("status") !== "—" && (
                          <span className="block text-xs text-muted-foreground">{field("status")}</span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">{p.paidAt ? p.paidAt.toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

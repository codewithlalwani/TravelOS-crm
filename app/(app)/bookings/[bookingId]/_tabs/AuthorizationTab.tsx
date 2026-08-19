import type { Booking } from "@/models/Booking";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SendEmailButton } from "@/components/SendEmailButton";
import { FareBreakdownTable } from "@/components/FareBreakdownTable";
import { sendAuthorizationAction, recordAuthorizationAction } from "../../actions";
import { ChargeAuthorizationFields } from "./ChargeAuthorizationFields";

export function AuthorizationTab({ booking, canManage }: { booking: Booking; canManage: boolean }) {
  const auth = booking.ticketAuthorization;
  const today = new Date().toISOString().slice(0, 10);
  const defaultAmount = booking.totalAmount ? Number(booking.totalAmount) : 0;
  const fares = booking.fares || [];
  const passengerCounts = (booking.passengers || []).reduce<Record<string, number>>((acc, p) => {
    acc[p.paxType] = (acc[p.paxType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Fare Breakdown</h3>
        <FareBreakdownTable fares={fares} passengerCounts={passengerCounts} currency={booking.currency} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">Charge authorization</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Record the details of the customer&apos;s phone authorization and send them the electronic signature copy.
        </p>

        {!auth?.emailSentAt && !canManage ? (
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to send authorization emails.</p>
        ) : !auth?.emailSentAt ? (
          <form action={sendAuthorizationAction} className="space-y-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <ChargeAuthorizationFields
              defaultAmount={defaultAmount}
              defaultCustomerName={booking.customer?.name || ""}
              currency={booking.currency}
              today={today}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-card-foreground">
                Note to include (optional)
              </label>
              <textarea
                name="body"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add a personal note to include in the authorization email..."
              />
            </div>
            <SendEmailButton
              confirmTitle="Send authorization email?"
              confirmMessage="This will email the charge authorization copy to the recipients below."
              defaultRecipients={booking.customer?.email ? [booking.customer.email] : []}
              confirmLabel="Send Email"
              pendingLabel="Sending…"
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send Charge Authorization
            </SendEmailButton>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="text-muted-foreground">Sent {auth.emailSentAt.toLocaleString()}</p>
              <p className="mt-2 font-medium capitalize text-foreground">Status: {auth.status}</p>
              {auth.customerReplyText && (
                <p className="mt-2 text-foreground">Customer reply: &ldquo;{auth.customerReplyText}&rdquo;</p>
              )}
              {auth.authorizedAmount && (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Authorized amount</p>
                    <p className="font-medium text-foreground">
                      {booking.currency} {Number(auth.authorizedAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Authorization date</p>
                    <p className="font-medium text-foreground">{auth.authorizationDate}</p>
                  </div>
                  {auth.charges?.map((c, i) => (
                    <div key={i}>
                      <p className="text-muted-foreground">
                        Charge - {i + 1} ({c.label})
                      </p>
                      <p className="font-medium text-foreground">
                        {booking.currency} {Number(c.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {auth.refundAmount && (
                    <div>
                      <p className="text-muted-foreground">Refund</p>
                      <p className="font-medium text-foreground">
                        {booking.currency} {Number(auth.refundAmount).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">E-signature</p>
                    <p className="font-medium italic text-foreground">{auth.eSignatureName}</p>
                  </div>
                </div>
              )}
            </div>

            {canManage && auth.status === "pending" && (
              <form action={recordAuthorizationAction} className="space-y-3 border-t border-border pt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <div>
                  <label className="mb-1 block text-sm font-medium text-card-foreground">
                    Record customer&apos;s reply
                  </label>
                  <textarea
                    name="replyText"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Paste or summarize the customer's reply..."
                  />
                </div>
                <div className="flex gap-3">
                  <ConfirmSubmitButton
                    name="decision"
                    value="authorized"
                    confirmTitle="Mark as authorized?"
                    confirmMessage="This will record the customer as having authorized ticket issuance."
                    confirmLabel="Mark Authorized"
                    className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Authorized
                  </ConfirmSubmitButton>
                  <ConfirmSubmitButton
                    name="decision"
                    value="declined"
                    danger
                    confirmTitle="Mark as declined?"
                    confirmMessage="This will record the customer as having declined ticket issuance."
                    confirmLabel="Mark Declined"
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark Declined
                  </ConfirmSubmitButton>
                </div>
              </form>
            )}

            {canManage && (
              <form action={sendAuthorizationAction} className="space-y-4 border-t border-border pt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <ChargeAuthorizationFields
                  defaultAmount={auth.authorizedAmount ? Number(auth.authorizedAmount) : defaultAmount}
                  defaultCustomerName={auth.eSignatureName || booking.customer?.name || ""}
                  currency={booking.currency}
                  today={today}
                  defaultDate={auth.authorizationDate || undefined}
                  defaultRefundAmount={auth.refundAmount != null ? Number(auth.refundAmount) : undefined}
                  defaultCharges={auth.charges?.map((c) => ({ label: c.label, amount: Number(c.amount) }))}
                />
                <textarea
                  name="body"
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add a personal note to include when resending..."
                />
                <SendEmailButton
                  confirmTitle="Resend authorization email?"
                  confirmMessage="This will send another authorization email to the recipients below."
                  defaultRecipients={booking.customer?.email ? [booking.customer.email] : []}
                  confirmLabel="Resend Email"
                  pendingLabel="Sending…"
                  className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resend authorization email
                </SendEmailButton>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

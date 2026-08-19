import type { Booking } from "@/models/Booking";
import { statusAtLeast } from "@/models/Booking";
import { PRIMARY_DOC_TYPE_BY_BOOKING_TYPE, PRIMARY_DOC_LABEL } from "@/models/BookingDocument";
import { storedFileUrl } from "@/lib/storage/FileStorageAdapter";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { SendEmailButton } from "@/components/SendEmailButton";
import { EditInvoiceButton } from "@/components/EditInvoiceButton";
import FileUpload from "@/components/FileUpload";
import {
  uploadPrimaryDocumentAction,
  sendPrimaryDocumentAction,
  uploadSupportingDocumentAction,
  generateInvoiceAction,
  sendInvoiceAction,
  updateInvoiceAction,
} from "../../actions";

export function DocumentsTab({
  booking,
  canManage,
  canManageInvoice,
}: {
  booking: Booking;
  canManage: boolean;
  canManageInvoice: boolean;
}) {
  const docs = booking.documents || [];
  const primaryDocType = PRIMARY_DOC_TYPE_BY_BOOKING_TYPE[booking.type];
  const primaryLabel = PRIMARY_DOC_LABEL[primaryDocType];
  const primaryDoc = docs.find((d) => d.isPrimary);
  const supportingDocs = docs.filter((d) => !d.isPrimary);
  const canUploadPrimary = statusAtLeast(booking.status, "payment_received");
  const primarySent = statusAtLeast(booking.status, "primary_doc_sent");
  const invoices = booking.invoices || [];
  const canGenerateInvoice = statusAtLeast(booking.status, "primary_doc_sent");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">{primaryLabel}</h3>
        {!canUploadPrimary && !primaryDoc && (
          <p className="text-sm text-muted-foreground">Available once payment has been received.</p>
        )}
        {primaryDoc ? (
          <div className="space-y-3">
            <a
              href={storedFileUrl(primaryDoc.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Download {primaryLabel.toLowerCase()}
            </a>
            <div>
              {primarySent ? (
                <p className="text-xs font-medium text-success">Sent to customer</p>
              ) : canManage ? (
                <form action={sendPrimaryDocumentAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <SendEmailButton
                    confirmTitle={`Send ${primaryLabel.toLowerCase()} to customer?`}
                    confirmMessage={`This will email the ${primaryLabel.toLowerCase()} to the recipients below.`}
                    defaultRecipients={booking.customer?.email ? [booking.customer.email] : []}
                    confirmLabel="Send"
                    pendingLabel="Sending…"
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Send {primaryLabel} to customer
                  </SendEmailButton>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">You don&apos;t have permission to send this document.</p>
              )}
            </div>
          </div>
        ) : (
          canUploadPrimary &&
          (canManage ? (
            <form action={uploadPrimaryDocumentAction} className="max-w-sm space-y-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <FileUpload name="file" required />
              <ConfirmSubmitButton
                confirmTitle={`Upload ${primaryLabel.toLowerCase()}?`}
                confirmMessage={`This will upload the selected file as the ${primaryLabel.toLowerCase()} for this booking.`}
                confirmLabel="Upload"
                pendingLabel="Uploading…"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Upload {primaryLabel}
              </ConfirmSubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">You don&apos;t have permission to upload documents.</p>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Supporting documents</h3>
        {canManage && (
          <form action={uploadSupportingDocumentAction} className="mb-4 max-w-sm space-y-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-card-foreground">Type</label>
              <select
                name="docType"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="passport">Passport Copy</option>
                <option value="visa">Visa Document</option>
                <option value="other">Other</option>
              </select>
            </div>
            <FileUpload name="file" required />
            <ConfirmSubmitButton
              confirmTitle="Upload supporting document?"
              confirmMessage="This will upload the selected file as a supporting document for this booking."
              confirmLabel="Upload"
              pendingLabel="Uploading…"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload
            </ConfirmSubmitButton>
          </form>
        )}

        {supportingDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No supporting documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {supportingDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{PRIMARY_DOC_LABEL[d.docType]}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {d.uploadedAt.toLocaleString()} by {d.uploader?.name}
                  </p>
                </div>
                <a
                  href={storedFileUrl(d.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {invoices.length === 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h3 className="mb-1 font-heading text-sm font-semibold text-card-foreground">Generate invoice</h3>
          {!canGenerateInvoice ? (
            <p className="text-sm text-muted-foreground">
              Available once the ticket (or voucher) has been sent to the customer.
            </p>
          ) : !canManageInvoice ? (
            <p className="text-sm text-muted-foreground">You don&apos;t have permission to generate invoices.</p>
          ) : (
            <form action={generateInvoiceAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <ConfirmSubmitButton
                confirmTitle="Generate invoice?"
                confirmMessage="This will generate the invoice for this booking."
                confirmLabel="Generate Invoice"
                pendingLabel="Generating…"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate Invoice
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}

      {invoices.map((invoice) => (
        <div key={invoice.id} className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="font-heading text-sm font-semibold text-card-foreground">Invoice {invoice.invoiceNo}</h3>
            {invoice.sentAt ? (
              <span className="text-xs font-medium text-success">Sent to customer</span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Not yet sent</span>
            )}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium text-foreground">
                {invoice.currency} {Number(invoice.amount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Generated</dt>
              <dd className="text-foreground">{invoice.generatedAt.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Sent</dt>
              <dd className="text-foreground">{invoice.sentAt ? invoice.sentAt.toLocaleString() : "Not yet sent"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {invoice.pdfUrl && (
              <a
                href={storedFileUrl(invoice.pdfUrl)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Download Invoice PDF
              </a>
            )}
            {!invoice.sentAt && canManageInvoice && (
              <form action={updateInvoiceAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <EditInvoiceButton
                  invoiceNo={invoice.invoiceNo}
                  currency={invoice.currency}
                  amount={invoice.amount}
                  lineItems={invoice.lineItems ?? null}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit Invoice
                </EditInvoiceButton>
              </form>
            )}
            {!invoice.sentAt && canManageInvoice && (
              <form action={sendInvoiceAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <SendEmailButton
                  confirmTitle="Send invoice to customer?"
                  confirmMessage="This will email the invoice to the recipients below."
                  defaultRecipients={booking.customer?.email ? [booking.customer.email] : []}
                  confirmLabel="Send Invoice"
                  pendingLabel="Sending…"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send Invoice
                </SendEmailButton>
              </form>
            )}
          </div>
        </div>
      ))}

      {invoices.length > 0 && canGenerateInvoice && canManageInvoice && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6">
          <form action={generateInvoiceAction}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <ConfirmSubmitButton
              confirmTitle="Generate another invoice?"
              confirmMessage="This will create an additional invoice for this booking, separate from the ones above."
              confirmLabel="Generate Invoice"
              pendingLabel="Generating…"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Another Invoice
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

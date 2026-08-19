import type { ActivityTimelineEntry, ActivityEventType } from "@/models/ActivityTimelineEntry";
import { Pagination } from "@/components/Pagination";
import {
  IconMail,
  IconShieldCheck,
  IconCreditCard,
  IconCheckCircle,
  IconDocument,
  IconReceipt,
  IconPlus,
  IconEye,
  IconNote,
  IconEdit,
  IconTrash,
  IconX,
} from "@/components/icons";

const EVENT_ICON: Record<ActivityEventType, typeof IconMail> = {
  booking_created: IconPlus,
  booking_updated: IconEdit,
  booking_cancelled: IconX,
  booking_viewed: IconEye,
  auth_email_sent: IconMail,
  auth_received: IconShieldCheck,
  payment_link_created: IconCreditCard,
  payment_link_shared: IconMail,
  payment_received: IconCheckCircle,
  primary_doc_uploaded: IconDocument,
  primary_doc_sent: IconMail,
  invoice_generated: IconReceipt,
  invoice_sent: IconMail,
  invoice_updated: IconEdit,
  note_added: IconNote,
  note_updated: IconEdit,
  note_deleted: IconTrash,
};

export function TimelineTab({
  bookingId,
  entries,
  page,
  pageSize,
  total,
}: {
  bookingId: number;
  entries: ActivityTimelineEntry[];
  page: number;
  pageSize: number;
  total: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-sm text-muted-foreground">
        No activity yet. Every step of the workflow — authorization, payment, ticketing, and invoicing — is logged
        here automatically.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {entries.map((entry) => {
          const Icon = EVENT_ICON[entry.eventType];
          const actorLabel = entry.actor?.name || "System";
          const details = [entry.actorEmail, entry.actorRole].filter(Boolean).join(" · ");
          return (
            <li key={entry.id} className="flex gap-4 rounded-2xl border border-border bg-card shadow-sm p-4">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{entry.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {entry.occurredAt.toLocaleString()} · {actorLabel}
                  {details && ` (${details})`}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Pagination
          basePath={`/bookings/${bookingId}`}
          page={page}
          pageSize={pageSize}
          total={total}
          extraParams={{ tab: "timeline" }}
        />
      </div>
    </div>
  );
}

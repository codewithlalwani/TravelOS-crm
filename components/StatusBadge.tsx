import type { BookingStatus } from "@/models/Booking";
import { BOOKING_STATUS_LABEL } from "@/models/Booking";

const STATUS_STYLES: Record<BookingStatus, string> = {
  created: "bg-muted text-muted-foreground",
  auth_sent: "bg-warning-bg text-warning",
  authorized: "bg-primary/10 text-primary",
  payment_link_created: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  payment_received: "bg-success/10 text-success",
  primary_doc_uploaded: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  primary_doc_sent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  invoiced: "bg-accent/10 text-accent",
  completed: "bg-success text-success-foreground",
};

const CANCELLED_STYLE = "bg-danger/10 text-danger";

/**
 * Cancellation lives outside the workflow ladder (`bookings.cancelled_at`), so a cancelled
 * booking keeps whatever status it reached. Pass `cancelled` wherever a single badge stands in
 * for the booking — the cancellation supersedes the workflow status there.
 */
export function StatusBadge({ status, cancelled = false }: { status: BookingStatus; cancelled?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        cancelled ? CANCELLED_STYLE : STATUS_STYLES[status]
      }`}
    >
      {cancelled ? "Cancelled" : BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

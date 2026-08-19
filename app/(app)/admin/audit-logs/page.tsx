import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listAuditLogs } from "@/services/auditLogService";
import type { AuditEventType } from "@/models/AuditLog";

const EVENT_LABEL: Record<AuditEventType, string> = {
  login_success: "Login succeeded",
  login_failed: "Login failed",
  logout: "Logout",
  user_created: "User created",
  user_activated: "User activated",
  user_deactivated: "User deactivated",
  role_created: "Role created",
  role_updated: "Role updated",
  role_deleted: "Role deleted",
  booking_created: "Booking created",
  booking_updated: "Booking updated",
  booking_cancelled: "Booking cancelled",
  auth_email_sent: "Authorization email sent",
  auth_received: "Authorization received",
  payment_link_created: "Payment link created",
  payment_link_shared: "Payment link shared",
  payment_received: "Payment received",
  primary_doc_uploaded: "Document uploaded",
  primary_doc_sent: "Document sent",
  invoice_generated: "Invoice generated",
  invoice_sent: "Invoice sent",
  invoice_updated: "Invoice updated",
  note_added: "Note added",
  note_updated: "Note updated",
  note_deleted: "Note deleted",
};

const EVENT_TYPES = Object.keys(EVENT_LABEL) as AuditEventType[];

function formatOccurredAt(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventType?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "audit.view")) redirect(defaultPathFor(perms));

  const { eventType, page } = await searchParams;
  const validEventType = EVENT_TYPES.includes(eventType as AuditEventType) ? (eventType as AuditEventType) : undefined;

  const { rows, total, page: currentPage, pageSize } = await listAuditLogs({
    eventType: validEventType,
    page: page ? Number(page) : 1,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (validEventType) params.set("eventType", validEventType);
    params.set("page", String(p));
    return `/admin/audit-logs?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground">A record of authentication, user, role, and booking events across the system.</p>
      </div>

      <form action="/admin/audit-logs" method="GET" className="mb-4 flex max-w-xs items-center gap-2">
        <select
          name="eventType"
          defaultValue={validEventType ?? ""}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All events</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_LABEL[type]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Booking</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatOccurredAt(entry.occurredAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">{EVENT_LABEL[entry.eventType]}</td>
                <td className="px-4 py-3 text-foreground">{entry.description}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {entry.actor?.name ?? entry.actorEmail ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{entry.booking?.bookingRef ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{entry.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              {currentPage <= 1 ? (
                <span className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50">
                  Previous
                </span>
              ) : (
                <Link
                  href={hrefFor(currentPage - 1)}
                  className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage >= totalPages ? (
                <span className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50">
                  Next
                </span>
              ) : (
                <Link
                  href={hrefFor(currentPage + 1)}
                  className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

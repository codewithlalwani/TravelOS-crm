import Link from "next/link";
import { redirect } from "next/navigation";
import { listBookings } from "@/services/bookingQueryService";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { ListSearch } from "@/components/ListSearch";
import { Pagination } from "@/components/Pagination";
import { IconPlus, IconEdit } from "@/components/icons";

export default async function FlightBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "flights.view")) redirect(defaultPathFor(perms));
  const canCreate = can(perms, "flights.create");
  // Flights don't have a dedicated "edit" permission — reuse create, same as the rest of this module.
  const canEdit = canCreate;

  const { q, page } = await searchParams;
  const { rows: bookings, total, page: currentPage, pageSize } = await listBookings({
    q,
    type: "flight",
    page: page ? Number(page) : 1,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Flight Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage authorization, payment, ticketing and invoicing from one screen.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/bookings/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <IconPlus className="h-4 w-4" />
            New Flight Booking
          </Link>
        )}
      </div>

      <ListSearch basePath="/bookings/flights" q={q} placeholder="Search reference, PNR, or customer..." />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Travel Date</th>
              <th className="px-4 py-3 font-medium">Created By</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link href={`/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                    {b.bookingRef}
                  </Link>
                  {b.flightDetail?.pnr && <p className="text-xs text-muted-foreground">PNR {b.flightDetail.pnr}</p>}
                </td>
                <td className="px-4 py-3 text-foreground">{b.customer?.name}</td>
                <td className="px-4 py-3 text-foreground">
                  {b.flightDetail ? `${b.flightDetail.origin} → ${b.flightDetail.destination}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{b.flightDetail?.travelDate || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.agent?.name}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {b.totalAmount ? `${b.currency} ${Number(b.totalAmount).toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} cancelled={!!b.cancelledAt} />
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    {!b.cancelledAt && (
                      <Link
                        href={`/bookings/${b.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-secondary-foreground hover:underline"
                      >
                        <IconEdit className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 8 : 7} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `No flight bookings match "${q}".` : "No flight bookings yet. Create your first one to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/bookings/flights" q={q} page={currentPage} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}

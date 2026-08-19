import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, defaultPathFor, getPermissions } from "@/lib/auth/rbac";
import { listBookings } from "@/services/bookingQueryService";
import { ListSearch } from "@/components/ListSearch";
import { Pagination } from "@/components/Pagination";
import { StatusBadge } from "@/components/StatusBadge";
import { RailBookingPanel } from "./RailBookingPanel";
import { createRailBookingAction } from "../../actions";

export default async function NewRailBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const permissions = await getPermissions(session);
  if (!can(permissions, "flights.create")) redirect(defaultPathFor(permissions));
  const params = await searchParams;
  const isCreating = params.mode === "new" || !!params.error;

  if (isCreating) {
    return (
      <div className="max-w-[1200px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-foreground">New Rail Booking</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a rail booking by choosing departure and arrival stations.
            </p>
          </div>
          <Link
            href="/bookings/new/rail"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            View Rail Bookings
          </Link>
        </div>
        {params.error && (
          <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{params.error}</div>
        )}
        <RailBookingPanel action={createRailBookingAction} />
      </div>
    );
  }

  const { rows: bookings, total, page: currentPage, pageSize } = await listBookings({
    q: params.q,
    type: "train",
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="max-w-[1200px]">
      <section>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">All Rail Bookings</h2>
            <p className="text-sm text-muted-foreground">Search and manage previously created rail bookings.</p>
          </div>
          <Link
            href="/bookings/new/rail?mode=new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            New Rail Booking
          </Link>
        </div>

        <ListSearch
          basePath="/bookings/new/rail"
          q={params.q}
          placeholder="Search reference, reservation, or customer..."
        />

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
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/bookings/${booking.id}`} className="font-medium text-primary hover:underline">
                      {booking.bookingRef}
                    </Link>
                    {booking.flightDetail?.pnr && (
                      <p className="text-xs text-muted-foreground">Reservation {booking.flightDetail.pnr}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{booking.customer?.name}</td>
                  <td className="px-4 py-3 text-foreground">
                    {booking.flightDetail
                      ? `${booking.flightDetail.origin} → ${booking.flightDetail.destination}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.flightDetail?.travelDate || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{booking.agent?.name}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {booking.totalAmount ? `${booking.currency} ${Number(booking.totalAmount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} cancelled={!!booking.cancelledAt} />
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {params.q
                      ? `No rail bookings match "${params.q}".`
                      : "No rail bookings yet. Create your first one above to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            basePath="/bookings/new/rail"
            q={params.q}
            page={currentPage}
            pageSize={pageSize}
            total={total}
          />
        </div>
      </section>
    </div>
  );
}

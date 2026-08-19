import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listAllBookings,
  PAYMENT_STATUS_FILTER_LABEL,
  type PaymentStatusFilter,
} from "@/services/bookingQueryService";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { Pagination } from "@/components/Pagination";
import { TableScrollArea } from "@/components/TableScrollArea";
import { RefreshButton } from "@/components/RefreshButton";
import { NewBookingModal } from "@/components/NewBookingModal";
import { IconSearch } from "@/components/icons";
import {
  createFlightBookingAction,
  createRailBookingAction,
  createHotelBookingAction,
  createCarBookingAction,
} from "@/app/(app)/bookings/actions";
import {
  BOOKING_STATUS_ORDER,
  BOOKING_STATUS_LABEL,
  BOOKING_TYPE_LABEL,
  type BookingStatus,
  type BookingType,
} from "@/models/Booking";

const PAYMENT_STATUS_FILTERS = Object.keys(PAYMENT_STATUS_FILTER_LABEL) as PaymentStatusFilter[];

function isPaymentStatusFilter(value: string | undefined): value is PaymentStatusFilter {
  return !!value && (PAYMENT_STATUS_FILTERS as string[]).includes(value);
}

function isBookingStatus(value: string | undefined): value is BookingStatus {
  return !!value && (BOOKING_STATUS_ORDER as string[]).includes(value);
}

function money(amount: string | number | null, currency: string | null): string {
  if (amount === null || amount === "") return "—";
  return `${currency || "USD"} ${Number(amount).toFixed(2)}`;
}

function travelDate(booking: Awaited<ReturnType<typeof listAllBookings>>["rows"][number]): string {
  if (booking.flightDetail) return booking.flightDetail.travelDate;
  if (booking.hotelDetail) return booking.hotelDetail.checkIn;
  if (booking.carDetail) return booking.carDetail.pickupDateTime.toLocaleDateString();
  return "—";
}

export default async function AllBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    payment?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);

  // This screen spans all three booking modules, so it is scoped to whichever of them the
  // session can view rather than gated on a single permission.
  const allowedTypes: BookingType[] = [
    ...(can(perms, "flights.view") ? (["flight", "train"] as const) : []),
    ...(can(perms, "hotels.view") ? (["hotel"] as const) : []),
    ...(can(perms, "cars.view") ? (["car"] as const) : []),
  ];
  if (allowedTypes.length === 0) redirect(defaultPathFor(perms));

  const canCreateFlight = can(perms, "flights.create");
  const canCreateRail = canCreateFlight;
  const canCreateHotel = can(perms, "hotels.create");
  const canCreateCar = can(perms, "cars.create");
  const canCreate = canCreateFlight || canCreateRail || canCreateHotel || canCreateCar;

  const { q, type, status, payment, from, to, page } = await searchParams;
  const validType = allowedTypes.find((t) => t === type);
  const validStatus = isBookingStatus(status) ? status : undefined;
  const validPayment = isPaymentStatusFilter(payment) ? payment : undefined;

  const { rows, total, page: currentPage, pageSize, totals } = await listAllBookings({
    q,
    types: allowedTypes,
    type: validType,
    status: validStatus,
    paymentStatus: validPayment,
    from,
    to,
    page: page ? Number(page) : 1,
  });

  const hasFilters = !!(q || validType || validStatus || validPayment || from || to);

  function tabHrefFor(t?: BookingType): string {
    const params = new URLSearchParams();
    if (t) params.set("type", t);
    if (q) params.set("q", q);
    if (validStatus) params.set("status", validStatus);
    if (validPayment) params.set("payment", validPayment);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    return query ? `/bookings/all?${query}` : "/bookings/all";
  }

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const fieldClass =
    "rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">All Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Every flight, rail, hotel and car booking in one place, with PayGlocal payment status against each.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <NewBookingModal
              canFlights={canCreateFlight}
              canRail={canCreateRail}
              canHotels={canCreateHotel}
              canCars={canCreateCar}
              flightAction={createFlightBookingAction}
              railAction={createRailBookingAction}
              hotelAction={createHotelBookingAction}
              carAction={createCarBookingAction}
            />
          )}
          {/* Payment status lands via PayGlocal's webhook, out-of-band from this tab. */}
          <RefreshButton />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Bookings</p>
          <p className="mt-1 font-heading text-xl font-semibold text-foreground">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Value</p>
          <p className="mt-1 font-heading text-xl font-semibold text-foreground">{totals.totalAmount.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total MCO</p>
          <p className="mt-1 font-heading text-xl font-semibold text-foreground">{totals.mcoAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1">
        <Link href={tabHrefFor(undefined)} className={tabClass(!validType)}>
          All
        </Link>
        {allowedTypes.map((t) => (
          <Link key={t} href={tabHrefFor(t)} className={tabClass(validType === t)}>
            {BOOKING_TYPE_LABEL[t]}
          </Link>
        ))}
      </div>

      <form action="/bookings/all" method="GET" className="mb-4 flex flex-wrap items-end gap-2">
        {validType && <input type="hidden" name="type" value={validType} />}
        <div className="relative w-full sm:w-72">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Search reference, customer, GID…"
            className={`${fieldClass} w-full pl-9`}
          />
        </div>
        <select name="status" defaultValue={validStatus ?? ""} className={fieldClass} aria-label="Booking status">
          <option value="">All statuses</option>
          {BOOKING_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="payment" defaultValue={validPayment ?? ""} className={fieldClass} aria-label="Payment status">
          <option value="">All payments</option>
          {PAYMENT_STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_FILTER_LABEL[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          From
          <input name="from" type="date" defaultValue={from ?? ""} className={fieldClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          To
          <input name="to" type="date" defaultValue={to ?? ""} className={fieldClass} />
        </label>
        <button
          type="submit"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Apply
        </button>
        {hasFilters && (
          <Link
            href="/bookings/all"
            className="px-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <TableScrollArea>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Booking Date</th>
                <th className="px-4 py-3 font-medium">Travel Date</th>
                <th className="px-4 py-3 font-medium">Customer Name</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 text-right font-medium">MCO</th>
                <th className="px-4 py-3 font-medium">Booking Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                        {b.bookingRef}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{b.createdAt.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{travelDate(b)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {b.customer?.name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {b.agent?.name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">
                      {money(b.mcoAmount, b.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={b.status} cancelled={!!b.cancelledAt} />
                    </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {hasFilters ? "No bookings match your filters." : "No bookings yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScrollArea>

        <Pagination
          basePath="/bookings/all"
          q={q}
          extraParams={{ type: validType, status: validStatus, payment: validPayment, from, to }}
          page={currentPage}
          pageSize={pageSize}
          total={total}
        />
      </div>
    </div>
  );
}

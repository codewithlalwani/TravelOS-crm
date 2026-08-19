import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBookingWorkspace } from "@/services/bookingQueryService";
import { logBookingView, listActivityTimeline } from "@/services/activityService";
import { listBookingNotes } from "@/services/bookingNoteService";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { StatusBadge } from "@/components/StatusBadge";
import { CancelBookingButton } from "@/components/CancelBookingButton";
import { IconEdit } from "@/components/icons";
import { BOOKING_TYPE_LABEL } from "@/models/Booking";
import { cancelBookingAction } from "../actions";
import { OverviewTab } from "./_tabs/OverviewTab";
import { AuthorizationTab } from "./_tabs/AuthorizationTab";
import { PaymentTab } from "./_tabs/PaymentTab";
import { DocumentsTab } from "./_tabs/DocumentsTab";
import { NotesTab } from "./_tabs/NotesTab";
import { TimelineTab } from "./_tabs/TimelineTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "authorization", label: "Ticket Authorization" },
  { key: "payment", label: "Payment" },
  { key: "documents", label: "Documents & Invoice" },
  { key: "notes", label: "Notes" },
  { key: "timeline", label: "Activity Timeline" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function BookingWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ tab?: string; error?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);

  const { bookingId } = await params;
  const { tab, error, page } = await searchParams;

  const booking = await getBookingWorkspace(Number(bookingId));
  if (!booking) notFound();

  const viewPermission =
    booking.type === "hotel" ? "hotels.view" : booking.type === "car" ? "cars.view" : "flights.view";
  if (!can(perms, viewPermission)) redirect(defaultPathFor(perms));

  // Car bookings run the same authorization → payment → voucher → invoice pipeline as hotels,
  // so they get the same edit/cancel affordances and list link.
  const createPermission =
    booking.type === "hotel" ? "hotels.create" : booking.type === "car" ? "cars.create" : "flights.create";
  const listPath =
    booking.type === "hotel" ? "/bookings/hotels" : booking.type === "car" ? "/bookings/cars" : booking.type === "train" ? "/bookings/all?type=train" : "/bookings/flights";

  await logBookingView(booking.id, session?.userId ?? null);

  const activeTab: TabKey = (TABS.find((t) => t.key === tab)?.key || "overview") as TabKey;
  const currentPage = Math.max(1, Number(page) || 1);

  const notesResult = activeTab === "notes" ? await listBookingNotes(booking.id, currentPage) : null;
  const timelineResult = activeTab === "timeline" ? await listActivityTimeline(booking.id, currentPage) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold text-foreground">{booking.bookingRef}</h1>
            <StatusBadge status={booking.status} />
            {booking.cancelledAt && (
              <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger whitespace-nowrap">
                Cancelled
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {BOOKING_TYPE_LABEL[booking.type]} booking for {booking.customer?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {booking.type !== "train" && can(perms, createPermission) && (
            <Link
              href={`/bookings/${booking.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
            >
              <IconEdit className="h-3.5 w-3.5" />
              Edit Booking
            </Link>
          )}
          {!booking.cancelledAt && can(perms, "bookings.cancel") && (
            <form action={cancelBookingAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <CancelBookingButton bookingRef={booking.bookingRef} />
            </form>
          )}
          <Link href={listPath} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to {BOOKING_TYPE_LABEL[booking.type]} Bookings
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="mb-6 overflow-x-auto border-b border-border">
        <nav className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/bookings/${booking.id}?tab=${t.key}`}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && <OverviewTab booking={booking} />}
      {activeTab === "authorization" && <AuthorizationTab booking={booking} canManage={can(perms, "bookings.authorize")} />}
      {activeTab === "payment" && <PaymentTab booking={booking} canManage={can(perms, "bookings.payment")} />}
      {activeTab === "documents" && (
        <DocumentsTab
          booking={booking}
          canManage={can(perms, "bookings.documents")}
          canManageInvoice={can(perms, "bookings.invoice")}
        />
      )}
      {activeTab === "notes" && notesResult && (
        <NotesTab
          bookingId={booking.id}
          notes={notesResult.rows}
          page={notesResult.page}
          pageSize={notesResult.pageSize}
          total={notesResult.total}
          currentUserId={session!.userId}
          isAdmin={["admin", "manager"].includes(session!.roleKey)}
        />
      )}
      {activeTab === "timeline" && timelineResult && (
        <TimelineTab
          bookingId={booking.id}
          entries={timelineResult.rows}
          page={timelineResult.page}
          pageSize={timelineResult.pageSize}
          total={timelineResult.total}
        />
      )}
    </div>
  );
}

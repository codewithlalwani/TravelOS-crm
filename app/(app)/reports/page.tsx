import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, defaultPathFor, getPermissions } from "@/lib/auth/rbac";
import { getReportsData } from "@/services/reportService";
import { BOOKING_TYPE_LABEL } from "@/models/Booking";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportControls } from "@/components/ReportControls";
import { resolveReportPeriod } from "@/lib/reports/reportPeriod";

function money(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function date(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; view?: string; agentId?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const perms = await getPermissions(session);
  const isAgent = session.roleKey === "agent";
  if (!isAgent && !can(perms, "analytics.view")) redirect(defaultPathFor(perms));

  const filters = await searchParams;
  const view = filters.view === "agents" || filters.view === "bookings" ? filters.view : "all";
  const period = resolveReportPeriod(filters.from, filters.to);
  const requestedAgentId = Number(filters.agentId);
  const agentId = isAgent
    ? session.userId
    : Number.isInteger(requestedAgentId) && requestedAgentId > 0
      ? requestedAgentId
      : undefined;
  const data = await getReportsData({
    from: period.from,
    to: period.to,
    agentId,
  });
  const selectedAgent = agentId ? data.performance.find((agent) => agent.agentId === agentId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {isAgent ? "Your booking, client, currency, and performance data." : "Booking, client, currency, and team performance data."}
          </p>
        </div>
        <ReportControls
          key={`${view}-${period.from ?? ""}-${period.to ?? ""}-${agentId ?? ""}`}
          from={period.from}
          to={period.to}
          view={view}
          agentId={agentId}
          isDefaultPeriod={period.isDefaultMtd}
        />
      </div>

      {view !== "bookings" && <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground">Total MCO (USD)</h2>
        <p className="mb-4 text-xs text-muted-foreground">Each booking is converted to USD using its booking-date reference rate.</p>
        <div className="max-w-sm rounded-xl border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">USD</p>
          <p className="mt-1 text-xl font-semibold text-foreground">${money(data.totalMcoUsd)}</p>
        </div>
        {data.unavailableConversionCount > 0 && <p className="mt-3 text-xs text-warning">{data.unavailableConversionCount} booking conversion{data.unavailableConversionCount === 1 ? " is" : "s are"} unavailable and excluded from this total.</p>}
      </section>}

      {view !== "bookings" && <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3 font-medium">Agent</th><th className="px-5 py-3 font-medium">Managed by</th><th className="px-5 py-3 text-right font-medium">Bookings</th><th className="px-5 py-3 text-right font-medium">MCO (USD)</th></tr>
            </thead>
            <tbody>
              {data.performance.map((agent) => (
                <tr key={agent.agentId} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-foreground">
                    <Link
                      href={`/reports?${new URLSearchParams({ view: "bookings", agentId: String(agent.agentId), ...(period.from ? { from: period.from } : {}), ...(period.to ? { to: period.to } : {}) })}`}
                      className="text-primary hover:underline"
                    >
                      {agent.agent}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{agent.managedBy}</td>
                  <td className="px-5 py-3 text-right text-foreground">{agent.bookings}</td>
                  <td className="px-5 py-3 text-right text-foreground">${money(agent.mcoUsd)}</td>
                </tr>
              ))}
              {!data.performance.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No performance data in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}

      {view !== "agents" && <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-sm font-semibold text-card-foreground">
            {selectedAgent ? `${selectedAgent.agent} – Booking report` : "Booking report"}
          </h2>
          <p className="text-xs text-muted-foreground">{data.bookings.length} booking{data.bookings.length === 1 ? "" : "s"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">S. No.</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Number</th><th className="px-4 py-3 text-right font-medium">MCO (USD)</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Phone</th><th className="px-4 py-3 font-medium">Email</th></tr>
            </thead>
            <tbody>
              {data.bookings.map((booking, index) => (
                <tr key={booking.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{date(booking.createdAt)}</td>
                  <td className="px-4 py-3"><Link href={`/bookings/${booking.id}`} className="font-medium text-primary hover:underline">{booking.bookingRef}</Link></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">{data.mcoUsdByBookingId[booking.id] === null ? "Rate unavailable" : `$${money(data.mcoUsdByBookingId[booking.id] ?? 0)}`}</td>
                  <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                  <td className="px-4 py-3 text-foreground">{BOOKING_TYPE_LABEL[booking.type]}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{booking.customer?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{booking.customer?.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{booking.customer?.email ?? "—"}</td>
                </tr>
              ))}
              {!data.bookings.length && <tr><td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">No bookings found for the selected period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>}
    </div>
  );
}

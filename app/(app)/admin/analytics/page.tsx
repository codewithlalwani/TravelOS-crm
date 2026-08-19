import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { getDashboardData } from "@/services/analyticsService";
import { StatusBadge } from "@/components/StatusBadge";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[Number(month) - 1]} ${Number(day)}`;
}

export default async function AnalyticsPage() {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "analytics.view")) redirect(defaultPathFor(perms));

  const data = await getDashboardData();
  const maxDaily = Math.max(1, ...data.dailyBookings.map((d) => d.count));
  const peakDay = data.dailyBookings.reduce((a, b) => (b.count > a.count ? b : a), data.dailyBookings[0]);
  const totalStatusCount = data.statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Booking volume and revenue across the agency.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Total users" value={data.totalUsers} />
        <StatTile label="Total bookings" value={data.totalBookings} />
        <StatTile label="Bookings today" value={data.bookingsToday} />
        <StatTile label="Last 7 days" value={data.bookingsThisWeek} />
        <StatTile label="This month" value={data.bookingsThisMonth} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-5">
        <h2 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Revenue by currency</h2>
        {data.revenueByCurrency.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revenue recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.revenueByCurrency.map((r) => (
              <div key={r.currency} className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{r.currency}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {r.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Bookings per day — last 30 days</h2>
          {peakDay.count > 0 && (
            <p className="text-xs text-muted-foreground">
              Busiest day: <span className="font-medium text-promotion">{formatShortDate(peakDay.date)}</span> ·{" "}
              {peakDay.count} booking{peakDay.count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {formatShortDate(data.dailyBookings[0].date)} – {formatShortDate(data.dailyBookings[data.dailyBookings.length - 1].date)}
        </p>

        <div className="flex h-40 items-end gap-0.5">
          {data.dailyBookings.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[16px] transition-opacity ${
                  d.count > 0 ? "rounded-t-[4px] bg-primary group-hover:opacity-80" : "bg-border"
                }`}
                style={{ height: d.count > 0 ? `${Math.max((d.count / maxDaily) * 100, 4)}%` : "2px" }}
              />
              <div className="pointer-events-none absolute bottom-full mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background group-hover:block left-1/2 z-10">
                <span className="font-semibold">{d.count}</span> on {formatShortDate(d.date)}
              </div>
            </div>
          ))}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">View as table</summary>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyBookings.map((d) => (
                  <tr key={d.date} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 text-foreground">{d.date}</td>
                    <td className="px-3 py-1.5 text-foreground">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Bookings by status</h2>
          <table className="w-full text-sm">
            <tbody>
              {data.statusBreakdown.map((s) => (
                <tr key={s.status} className="border-t border-border first:border-0">
                  <td className="py-2">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2 text-right font-medium text-foreground">{s.count}</td>
                  <td className="py-2 pl-3 text-right text-xs text-muted-foreground w-20">
                    {totalStatusCount > 0 ? `${Math.round((s.count / totalStatusCount) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
          <h2 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Top creators</h2>
          {data.topAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-medium">Created by</th>
                  <th className="pb-2 text-right font-medium">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {data.topAgents.map((a) => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="py-2 font-medium text-foreground">{a.name}</td>
                    <td className="py-2 text-right text-foreground">{a.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

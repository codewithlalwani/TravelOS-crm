import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, defaultPathFor, getPermissions } from "@/lib/auth/rbac";
import { listLoginHistories } from "@/services/loginHistoryService";
import { ListSearch } from "@/components/ListSearch";
import { Pagination } from "@/components/Pagination";
import { isPrivateIp } from "@/lib/geo/geofence";

export default async function LoginHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const permissions = await getPermissions(session);
  if (!can(permissions, "audit.view")) redirect(defaultPathFor(permissions));

  const { q, status, page } = await searchParams;
  const result = await listLoginHistories({ q, status, page: Number(page) || 1 });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Login History</h1>
        <p className="text-sm text-muted-foreground">Successful and failed login attempts, including session logout times and IP locations.</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <ListSearch basePath="/admin/login-history" q={q} placeholder="Search login, IP, country or city..." />
        <form method="GET" className="flex items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="status" defaultValue={status ?? ""} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
            <option value="">All statuses</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
          <button className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Filter</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[1050px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">IP Address</th>
            <th className="px-4 py-3 font-medium">Login ID</th>
            <th className="px-4 py-3 font-medium">Login Status</th>
            <th className="px-4 py-3 font-medium">Login Time</th>
            <th className="px-4 py-3 font-medium">Logout Time</th>
            <th className="px-4 py-3 font-medium">IP Country</th>
            <th className="px-4 py-3 font-medium">IP City</th>
          </tr></thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                {(() => {
                  const localAddress = isPrivateIp(row.ipAddress);
                  return <>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{row.ipAddress ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-foreground">{row.loginId}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.loginStatus ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`} title={row.failureReason ?? undefined}>{row.loginStatus ? "Success" : "Failed"}</span></td>
                <td className="px-4 py-3 text-foreground">{row.loginTime.toLocaleString()}</td>
                <td className="px-4 py-3 text-foreground">{row.logoutTime?.toLocaleString() ?? (row.loginStatus ? "Active session" : "—")}</td>
                <td className="px-4 py-3 text-foreground">{row.ipCountry ?? (localAddress ? "Private network" : "—")}</td>
                <td className="px-4 py-3 text-foreground">{row.ipCity ?? (localAddress ? "Localhost" : "—")}</td>
                  </>;
                })()}
              </tr>
            ))}
            {result.rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No login history found.</td></tr>}
          </tbody>
        </table>
        <Pagination basePath="/admin/login-history" q={q} page={result.page} pageSize={result.pageSize} total={result.total} extraParams={{ status }} />
      </div>
    </div>
  );
}

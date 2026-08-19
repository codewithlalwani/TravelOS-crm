import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listUsersByBookingsCreated } from "@/services/userService";
import { ListSearch } from "@/components/ListSearch";
import { Pagination } from "@/components/Pagination";
import { IconPlus } from "@/components/icons";
import { toggleUserActiveAction } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.view")) redirect(defaultPathFor(perms));
  const canManageUsers = can(perms, "users.manage");

  const { q, page } = await searchParams;
  const { rows, total, page: currentPage, pageSize } = await listUsersByBookingsCreated({
    q,
    page: page ? Number(page) : 1,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Manage Admin and Agent accounts.</p>
        </div>
        {canManageUsers && (
          <Link
            href="/admin/users/new"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <IconPlus className="h-4 w-4" />
            Add User
          </Link>
        )}
      </div>

      <ListSearch basePath="/admin/users" q={q} placeholder="Search name or email..." />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Managed by</th>
              <th className="px-4 py-3 font-medium">Access Location</th>
              <th className="px-4 py-3 font-medium">Latest Login Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManageUsers && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user: u }) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-foreground">{u.roleRecord?.name}</td>
                <td className="px-4 py-3 text-foreground">
                  {u.creator ? (
                    <div>
                      <div className="font-medium">{u.creator.name}</div>
                      <div className="text-xs text-muted-foreground">{u.creator.roleRecord?.name ?? "No role"}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {(u.accessLocations?.length ?? 0) > 0 ? (
                    <div className="space-y-1">
                      {u.accessLocations!.map((location) => <div key={location.id}>{location.label}<div className="text-xs text-muted-foreground">{location.radiusKm} km radius</div></div>)}
                    </div>
                  ) : <span className="text-muted-foreground">Not set</span>}
                </td>
                <td className="px-4 py-3 text-xs text-foreground">
                  {u.lastLoginLatitude != null && u.lastLoginLongitude != null ? (
                    <div>
                      <a href={`https://www.google.com/maps?q=${u.lastLoginLatitude},${u.lastLoginLongitude}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {Number(u.lastLoginLatitude).toFixed(5)}, {Number(u.lastLoginLongitude).toFixed(5)}
                      </a>
                      <div className="text-muted-foreground">
                        {u.lastLoginLocationMethod?.toUpperCase()} · {u.lastLoginDistanceKm?.toFixed(1)} km from access point
                      </div>
                      <div className="text-muted-foreground">
                        {u.lastLoginAccuracy != null ? `±${Math.round(u.lastLoginAccuracy)} m · ` : ""}{u.lastLoginLocationAt?.toLocaleString()}
                      </div>
                    </div>
                  ) : <span className="text-muted-foreground">Not tracked</span>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManageUsers && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/users/${u.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                        Edit
                      </Link>
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="nextActive" value={(!u.isActive).toString()} />
                        <button type="submit" className="text-xs font-medium text-primary hover:underline">
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canManageUsers ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                  {q ? `No users match "${q}".` : "No users yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/admin/users" q={q} page={currentPage} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}

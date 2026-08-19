import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listRoles } from "@/services/roleService";
import { IconPlus } from "@/components/icons";

export default async function RolesPage() {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "roles.manage")) redirect(defaultPathFor(perms));

  const roles = await listRoles();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Define which screens and actions each role can access.
          </p>
        </div>
        <Link
          href="/admin/roles/new"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          <IconPlus className="h-4 w-4" />
          New Role
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {roles.map(({ role, userCount, permissionCount }) => (
              <tr key={role.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">
                  {role.name}
                  {(role.key === "admin" || role.key === "manager") && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Built-in
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">{userCount}</td>
                <td className="px-4 py-3 text-foreground">{role.key === "admin" || role.key === "manager" ? "Full access" : permissionCount}</td>
                <td className="px-4 py-3 text-right">
                  {role.key === "admin" || role.key === "manager" ? (
                    <span className="text-xs text-muted-foreground">Always full access</span>
                  ) : (
                    <Link href={`/admin/roles/${role.id}`} className="text-xs font-medium text-primary hover:underline">
                      Edit
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

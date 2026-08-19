import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listPermissionCatalog } from "@/services/roleService";
import { createRoleAction } from "../actions";

export default async function NewRolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "roles.manage")) redirect(defaultPathFor(perms));

  const { error } = await searchParams;
  const groups = listPermissionCatalog();

  return (
    <div className="max-w-xl">
      <Link href="/admin/roles" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Roles
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New Role</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a name and the screens/actions this role is allowed to use.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <form action={createRoleAction} className="mt-6 space-y-6 rounded-xl border border-border bg-card p-6">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-card-foreground">
            Role name
          </label>
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Support"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-4">
          {groups.map(({ group, permissions }) => (
            <div key={group}>
              <p className="mb-2 text-sm font-semibold text-card-foreground">{group}</p>
              <div className="space-y-2">
                {permissions.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 text-sm text-card-foreground">
                    <input type="checkbox" name="permissions" value={perm.key} className="rounded border-border" />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Create role
        </button>
      </form>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, defaultPathFor, getPermissions } from "@/lib/auth/rbac";
import { listRoles } from "@/services/roleService";
import { findUserById, listActiveReportingManagers } from "@/services/userService";
import { updateUserAction } from "../../actions";
import { AccessLocationsField } from "@/components/AccessLocationsField";

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.manage")) redirect(defaultPathFor(perms));

  const { userId: rawUserId } = await params;
  const userId = Number(rawUserId);
  if (!Number.isInteger(userId) || userId <= 0) notFound();

  const [{ error }, user, roles, managers] = await Promise.all([
    searchParams,
    findUserById(userId),
    listRoles(),
    listActiveReportingManagers(),
  ]);
  if (!user) notFound();

  const saveUser = updateUserAction.bind(null, user.id);

  return (
    <div className="max-w-lg">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Users
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Edit User</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update {user.name}&apos;s account details and authorised access location.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <form action={saveUser} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-card-foreground">Full name</label>
          <input id="name" name="name" required defaultValue={user.name} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-card-foreground">Email</label>
          <input id="email" name="email" type="email" required defaultValue={user.email} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-card-foreground">New password</label>
          <input id="password" name="password" type="password" minLength={8} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p className="mt-1 text-xs text-muted-foreground">Leave blank to keep the current password.</p>
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-card-foreground">Role</label>
          <select id="role" name="roleId" defaultValue={String(user.roleId)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {roles.map(({ role }) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>
        <AccessLocationsField initialLocations={(user.accessLocations ?? []).map((location) => ({ id: location.id, label: location.label, placeId: location.placeId, radiusKm: location.radiusKm }))} />
        <div>
          <label htmlFor="managedBy" className="mb-1 block text-sm font-medium text-card-foreground">Managed by</label>
          <select id="managedBy" name="managedById" required defaultValue={String(user.createdBy ?? session!.userId)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} — {manager.roleRecord?.name ?? "No role"}</option>)}
          </select>
        </div>
        <button type="submit" className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover">
          Save changes
        </button>
      </form>
    </div>
  );
}

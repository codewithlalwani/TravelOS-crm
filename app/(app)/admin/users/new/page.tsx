import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listRoles } from "@/services/roleService";
import { listActiveReportingManagers } from "@/services/userService";
import { createUserAction } from "../actions";
import { AccessLocationsField } from "@/components/AccessLocationsField";
import { IconCheckCircle, IconShieldCheck } from "@/components/icons";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.manage")) redirect(defaultPathFor(perms));

  const { error } = await searchParams;
  const [roles, managers] = await Promise.all([listRoles(), listActiveReportingManagers()]);

  return (
    <div className="max-w-lg">
      <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Users
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Add User</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create an Agent, Manager, or Admin account directly from the dashboard.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <form action={createUserAction} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-card-foreground">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-card-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-card-foreground">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="password-policy password-sharing-note"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div id="password-policy" className="mt-3 rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <IconShieldCheck className="h-4.5 w-4.5 text-primary" />
              <span>Password policy</span>
            </div>
            <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2">
              {["At least 8 characters", "One uppercase letter", "One lowercase letter", "One number and one symbol"].map((rule) => (
                <li key={rule} className="flex items-center gap-2">
                  <IconCheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <p id="password-sharing-note" className="mt-2 text-xs text-muted-foreground">Share this temporary password with the user securely.</p>
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-card-foreground">
            Role
          </label>
          <select
            id="role"
            name="roleId"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {roles.map(({ role }) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <AccessLocationsField />
        <div>
          <label htmlFor="managedBy" className="mb-1 block text-sm font-medium text-card-foreground">
            Managed by
          </label>
          <select
            id="managedBy"
            name="managedById"
            required
            defaultValue={String(session!.userId)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name} — {manager.roleRecord?.name ?? "No role"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Select the person responsible for managing this user.</p>
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Create account
        </button>
      </form>
    </div>
  );
}

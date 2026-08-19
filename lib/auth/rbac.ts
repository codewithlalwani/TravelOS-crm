import { cache } from "react";
import "../../models/associations";
import type { SessionPayload } from "./session";
import { PERMISSION_CATALOG, type PermissionKey } from "./permissions";
import { Role } from "../../models/Role";
import { Permission } from "../../models/Permission";

const ALL_PERMISSION_KEYS = new Set<PermissionKey>(PERMISSION_CATALOG.map((p) => p.key as PermissionKey));

function normalizedRole(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Built-in administrative roles whose access must not depend on editable DB grants. */
export function isFullAccessRole(roleKey: string, roleName?: string): boolean {
  const identities = [normalizedRole(roleKey), normalizedRole(roleName)];
  return identities.some((identity) => identity === "admin" || identity === "manager" || identity === "systemadmin");
}

/**
 * The built-in Admin and Manager roles are implicit superusers — they always have every
 * permission and is never shown as editable checkboxes in the Roles UI.
 * This avoids an admin locking themselves out by unchecking their own
 * roles.manage permission. Every other role's permissions come from the DB.
 */
const getPermissionsUncached = async (session: SessionPayload | null): Promise<Set<PermissionKey>> => {
  if (!session) return new Set();
  if (isFullAccessRole(session.roleKey, session.roleName)) return new Set(ALL_PERMISSION_KEYS);

  const role = await Role.findByPk(session.roleId, { include: [{ model: Permission, as: "permissions" }] });
  return new Set((role?.permissions ?? []).map((p) => p.key as PermissionKey));
};

export const getPermissions = cache(getPermissionsUncached);

export function can(permissions: Set<PermissionKey>, key: PermissionKey): boolean {
  return permissions.has(key);
}

/** Landing screen for this session — used to redirect away from a screen it can't access. */
export function defaultPathFor(permissions: Set<PermissionKey>): string {
  return permissions.size > 0 ? "/dashboard" : "/login";
}

export function requireSession(session: SessionPayload | null): asserts session is SessionPayload {
  if (!session) throw new Error("Not authenticated");
}

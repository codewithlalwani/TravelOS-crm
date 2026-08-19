"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession, type SessionPayload } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { createRole, updateRole, deleteRole } from "@/services/roleService";
import { PERMISSION_CATALOG, type PermissionKey } from "@/lib/auth/permissions";
import { logAuditEvent, getClientIp } from "@/services/auditLogService";

const VALID_KEYS = new Set(PERMISSION_CATALOG.map((p) => p.key));

async function requireRoleManager(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "roles.manage")) throw new Error("Not authorized");
  return session!;
}

function permissionKeysFromForm(formData: FormData): PermissionKey[] {
  return formData
    .getAll("permissions")
    .map((v) => String(v))
    .filter((key): key is PermissionKey => VALID_KEYS.has(key));
}

export async function createRoleAction(formData: FormData) {
  const session = await requireRoleManager();

  const name = String(formData.get("name") || "").trim();
  const permissionKeys = permissionKeysFromForm(formData);

  try {
    await createRole({ name, permissionKeys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create role";
    redirect(`/admin/roles/new?error=${encodeURIComponent(msg)}`);
  }

  await logAuditEvent({
    eventType: "role_created",
    description: `${session.name} created role ${name}`,
    actorId: session.userId,
    actorEmail: session.email,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/roles");
  redirect("/admin/roles");
}

export async function updateRoleAction(formData: FormData) {
  const session = await requireRoleManager();

  const roleId = Number(formData.get("roleId"));
  const name = String(formData.get("name") || "").trim();
  const permissionKeys = permissionKeysFromForm(formData);

  try {
    await updateRole(roleId, { name, permissionKeys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update role";
    redirect(`/admin/roles/${roleId}?error=${encodeURIComponent(msg)}`);
  }

  await logAuditEvent({
    eventType: "role_updated",
    description: `${session.name} updated role ${name}`,
    actorId: session.userId,
    actorEmail: session.email,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
  redirect("/admin/roles");
}

export async function deleteRoleAction(formData: FormData) {
  const session = await requireRoleManager();

  const roleId = Number(formData.get("roleId"));
  try {
    await deleteRole(roleId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not delete role";
    redirect(`/admin/roles/${roleId}?error=${encodeURIComponent(msg)}`);
  }

  await logAuditEvent({
    eventType: "role_deleted",
    description: `${session.name} deleted role #${roleId}`,
    actorId: session.userId,
    actorEmail: session.email,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/roles");
  redirect("/admin/roles");
}

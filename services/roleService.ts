import "../models/associations";
import { Role } from "../models/Role";
import { Permission } from "../models/Permission";
import { User } from "../models/User";
import { PERMISSION_CATALOG, groupedPermissionCatalog, type PermissionKey } from "../lib/auth/permissions";

export function listPermissionCatalog() {
  return groupedPermissionCatalog();
}

export interface RoleWithCounts {
  role: Role;
  userCount: number;
  permissionCount: number;
}

export async function listRoles(): Promise<RoleWithCounts[]> {
  const roles = await Role.findAll({
    include: [{ model: Permission, as: "permissions" }],
    order: [["createdAt", "ASC"]],
  });

  const counts = await User.findAll({ attributes: ["roleId"], raw: true });
  const userCountByRoleId = new Map<number, number>();
  for (const { roleId } of counts as unknown as Array<{ roleId: number }>) {
    userCountByRoleId.set(roleId, (userCountByRoleId.get(roleId) ?? 0) + 1);
  }

  return roles.map((role) => ({
    role,
    userCount: userCountByRoleId.get(role.id) ?? 0,
    permissionCount: role.key === "admin" || role.key === "manager" ? PERMISSION_CATALOG.length : (role.permissions ?? []).length,
  }));
}

export async function getRoleWithPermissions(roleId: number) {
  return Role.findByPk(roleId, { include: [{ model: Permission, as: "permissions" }] });
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function resolvePermissionIds(permissionKeys: PermissionKey[]) {
  const permissions = await Permission.findAll({ where: { key: permissionKeys } });
  return permissions.map((p) => p.id);
}

export async function createRole(params: { name: string; permissionKeys: PermissionKey[] }) {
  const name = params.name.trim();
  if (!name) throw new Error("Role name is required");

  const key = slugify(name);
  if (!key) throw new Error("Role name must contain at least one letter or number");

  const existing = await Role.findOne({ where: { key } });
  if (existing) throw new Error("A role with this name already exists");

  const role = await Role.create({ key, name });
  const permissionIds = await resolvePermissionIds(params.permissionKeys);
  if (permissionIds.length > 0) {
    await role.setPermissions(permissionIds);
  }
  return role;
}

export async function updateRole(roleId: number, params: { name: string; permissionKeys: PermissionKey[] }) {
  const role = await Role.findByPk(roleId);
  if (!role) throw new Error("Role not found");
  if (role.key === "admin" || role.key === "manager") throw new Error("Built-in full-access roles cannot be edited");

  const name = params.name.trim();
  if (!name) throw new Error("Role name is required");

  await role.update({ name });
  const permissionIds = await resolvePermissionIds(params.permissionKeys);
  await role.setPermissions(permissionIds);
  return role;
}

export async function deleteRole(roleId: number) {
  const role = await Role.findByPk(roleId);
  if (!role) throw new Error("Role not found");
  if (role.key === "admin" || role.key === "manager") throw new Error("Built-in roles cannot be deleted");

  const userCount = await User.count({ where: { roleId } });
  if (userCount > 0) throw new Error("Cannot delete a role that is assigned to users");

  await role.destroy();
}

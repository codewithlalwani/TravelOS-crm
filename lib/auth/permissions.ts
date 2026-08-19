export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

/**
 * Single source of truth for the permission catalog. Migration
 * 20260101000024-create-permissions.js seeds these same rows into the DB —
 * keep the two in sync when adding a permission.
 */
export const PERMISSION_CATALOG: PermissionDef[] = [
  { key: "flights.view", label: "View flight bookings", group: "Flights" },
  { key: "flights.create", label: "Create flight bookings", group: "Flights" },
  { key: "hotels.view", label: "View hotel bookings", group: "Hotels" },
  { key: "hotels.create", label: "Create hotel bookings", group: "Hotels" },
  { key: "cars.view", label: "View car bookings", group: "Cars" },
  { key: "cars.create", label: "Create car bookings", group: "Cars" },
  { key: "bookings.authorize", label: "Send / record ticket authorization", group: "Bookings" },
  { key: "bookings.payment", label: "Create / send payment links, record manual payments", group: "Bookings" },
  { key: "bookings.documents", label: "Upload / send documents", group: "Bookings" },
  { key: "bookings.invoice", label: "Generate / send invoices", group: "Bookings" },
  { key: "bookings.cancel", label: "Cancel bookings", group: "Bookings" },
  { key: "customers.view", label: "View customers", group: "Customers" },
  { key: "analytics.view", label: "View analytics", group: "Analytics" },
  { key: "payments.view", label: "View payment transactions", group: "Payments" },
  { key: "users.view", label: "View users", group: "Users" },
  { key: "users.manage", label: "Create users, activate/deactivate", group: "Users" },
  { key: "roles.manage", label: "Manage roles and permissions", group: "Roles" },
  { key: "audit.view", label: "View audit log", group: "Audit" },
];

export type PermissionKey =
  | "flights.view"
  | "flights.create"
  | "hotels.view"
  | "hotels.create"
  | "cars.view"
  | "cars.create"
  | "bookings.authorize"
  | "bookings.payment"
  | "bookings.documents"
  | "bookings.invoice"
  | "bookings.cancel"
  | "customers.view"
  | "analytics.view"
  | "payments.view"
  | "users.view"
  | "users.manage"
  | "roles.manage"
  | "audit.view";

export const AGENT_DEFAULT_PERMISSIONS: PermissionKey[] = [
  "flights.view",
  "flights.create",
  "hotels.view",
  "hotels.create",
  "cars.view",
  "cars.create",
  "bookings.authorize",
  "bookings.payment",
  "bookings.documents",
  "bookings.invoice",
  "customers.view",
];

export function groupedPermissionCatalog(): Array<{ group: string; permissions: PermissionDef[] }> {
  const groups = new Map<string, PermissionDef[]>();
  for (const perm of PERMISSION_CATALOG) {
    const list = groups.get(perm.group) ?? [];
    list.push(perm);
    groups.set(perm.group, list);
  }
  return Array.from(groups.entries()).map(([group, permissions]) => ({ group, permissions }));
}

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import {
  IconHome,
  IconPlane,
  IconTrain,
  IconCar,
  IconUsers,
  IconUser,
  IconLogout,
  IconShieldCheck,
  IconClipboardList,
  IconList,
  IconDocument,
  IconClock,
} from "@/components/icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav, type NavItem } from "@/components/MobileNav";
import { logout } from "./actions";
import { AdminNotificationBell } from "@/components/AdminNotificationBell";
import { listNotifications } from "@/services/notificationService";
import { InactivityLogout } from "@/components/InactivityLogout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const perms = await getPermissions(session);
  const notificationData = session.roleKey === "admin" || session.roleKey === "manager" ? await listNotifications(session.userId) : null;

  const label = "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[160px] group-hover:opacity-100";

  // The combined bookings view spans all three modules, so any one of them unlocks it.
  const canViewAnyBooking = can(perms, "flights.view") || can(perms, "hotels.view") || can(perms, "cars.view");

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "home" },
    ...(canViewAnyBooking ? [{ href: "/bookings/all", label: "All Bookings", icon: "list" as const }] : []),
    ...(can(perms, "flights.view")
      ? [{ href: "/bookings/flights", label: "Flight Bookings", icon: "plane" as const }]
      : []),
    ...(can(perms, "flights.create")
      ? [{ href: "/bookings/new/rail", label: "New Rail Booking", icon: "train" as const }]
      : []),
    ...(can(perms, "cars.view")
      ? [{ href: "/bookings/cars", label: "Car Bookings", icon: "car" as const }]
      : []),
    ...(can(perms, "customers.view") ? [{ href: "/customers", label: "Customers", icon: "user" as const }] : []),
    ...(can(perms, "analytics.view") || session.roleKey === "agent"
      ? [{ href: "/reports", label: "Reports", icon: "document" as const }]
      : []),
    ...(can(perms, "bookings.payment")
      ? [{ href: "/admin/payglocal-test", label: "PayGlocal Test", icon: "creditCard" as const }]
      : []),
    ...(can(perms, "users.view") ? [{ href: "/admin/users", label: "Users", icon: "users" as const }] : []),
    ...(can(perms, "roles.manage") ? [{ href: "/admin/roles", label: "Roles", icon: "shieldCheck" as const }] : []),
    ...(can(perms, "audit.view")
      ? [{ href: "/admin/audit-logs", label: "Audit Log", icon: "clipboardList" as const }]
      : []),
    ...(can(perms, "audit.view")
      ? [{ href: "/admin/login-history", label: "Login History", icon: "clock" as const }]
      : []),
    { href: "/settings/security", label: "Security", icon: "shieldCheck" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <InactivityLogout sessionId={String(session.loginHistoryId ?? session.userId)} />
      {/* Reserves the collapsed-width gap in normal flow; the sidebar itself overlays on hover. */}
      <div className="hidden w-20 flex-shrink-0 md:block" />
      <aside className="group fixed inset-y-0 left-0 z-20 hidden w-20 flex-col overflow-hidden border-r border-border bg-card shadow-none transition-all duration-200 hover:w-64 hover:shadow-xl md:flex">


        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/dashboard"
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            <IconHome className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className={label}>Dashboard</span>
          </Link>
          {canViewAnyBooking && (
            <Link
              href="/bookings/all"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconList className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>All Bookings</span>
            </Link>
          )}
          {can(perms, "flights.view") && (
            <Link
              href="/bookings/flights"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconPlane className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Flight Bookings</span>
            </Link>
          )}
          {can(perms, "flights.create") && (
            <Link
              href="/bookings/new/rail"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconTrain className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>New Rail Booking</span>
            </Link>
          )}
          {can(perms, "cars.view") && (
            <Link
              href="/bookings/cars"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconCar className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Car Bookings</span>
            </Link>
          )}
          {can(perms, "customers.view") && (
            <Link
              href="/customers"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconUser className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Customers</span>
            </Link>
          )}
          {(can(perms, "analytics.view") || session.roleKey === "agent") && (
            <Link
              href="/reports"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconDocument className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Reports</span>
            </Link>
          )}
          {can(perms, "users.view") && (
            <Link
              href="/admin/users"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconUsers className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Users</span>
            </Link>
          )}
          {can(perms, "roles.manage") && (
            <Link
              href="/admin/roles"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconShieldCheck className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Roles</span>
            </Link>
          )}
          {can(perms, "audit.view") && (
            <Link
              href="/admin/audit-logs"
              className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <IconClipboardList className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Audit Log</span>
            </Link>
          )}
          {can(perms, "audit.view") && (
            <Link href="/admin/login-history" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted">
              <IconClock className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <span className={label}>Login History</span>
            </Link>
          )}
          <Link href="/settings/security" className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-card-foreground transition-colors hover:bg-muted">
            <IconShieldCheck className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className={label}>Security</span>
          </Link>
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {session.name.slice(0, 1).toUpperCase()}
            </div>
            <div className={`min-w-0 ${label}`}>
              <p className="truncate text-sm font-medium text-card-foreground">{session.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{session.roleName}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <IconLogout className="h-4 w-4 flex-shrink-0" />
              <span className={label}>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 md:px-10">
          <span className="flex items-center gap-2 md:hidden">
            <MobileNav navItems={navItems} userName={session.name} roleName={session.roleName} logout={logout} />
           
          </span>
          <span className="hidden md:block" />
          <div className="flex items-center gap-2">
            {notificationData && <AdminNotificationBell initialData={notificationData} />}
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}

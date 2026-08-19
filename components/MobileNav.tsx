"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconMenu,
  IconX,
  IconHome,
  IconPlane,
  IconTrain,
  IconBuilding,
  IconCar,
  IconUsers,
  IconUser,
  IconLogout,
  IconChartBar,
  IconShieldCheck,
  IconClipboardList,
  IconCreditCard,
  IconReceipt,
  IconList,
  IconDocument,
  IconClock,
} from "@/components/icons";

const ICONS = {
  home: IconHome,
  list: IconList,
  document: IconDocument,
  plane: IconPlane,
  train: IconTrain,
  building: IconBuilding,
  car: IconCar,
  user: IconUser,
  chartBar: IconChartBar,
  creditCard: IconCreditCard,
  receipt: IconReceipt,
  users: IconUsers,
  shieldCheck: IconShieldCheck,
  clipboardList: IconClipboardList,
  clock: IconClock,
} as const;

export type NavIconKey = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
}

export function MobileNav({
  navItems,
  userName,
  roleName,
  logout,
}: {
  navItems: NavItem[];
  userName: string;
  roleName: string;
  logout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex h-full w-72 max-w-[80vw] flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <Image src="/logo.png" alt="fsn TravelTech" width={539} height={287} className="h-9 w-auto rounded-md" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navItems.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-card-foreground">{userName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{roleName}</p>
                </div>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <IconLogout className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

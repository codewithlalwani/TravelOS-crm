"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { IconBell, IconCheckCircle } from "@/components/icons";
import type { NotificationDto } from "@/services/notificationService";
import { readAllNotifications, readNotification } from "@/app/(app)/notificationActions";

type NotificationData = { unreadCount: number; notifications: NotificationDto[] };

const subscribeToHydration = () => () => {};

function LocalDateTime({ value }: { value: string }) {
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const formatted = isHydrated ? new Date(value).toLocaleString() : value;

  return (
    <time className="mt-2 block text-[11px] text-muted-foreground" dateTime={value}>
      {formatted}
    </time>
  );
}

function loginDetails(notification: NotificationDto) {
  const details = notification.details;
  if (!details) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <dt>Email</dt><dd className="truncate text-foreground">{details.email}</dd>
      <dt>Role</dt><dd className="text-foreground">{details.role}</dd>
      <dt>IP</dt><dd className="text-foreground">{details.ipAddress || "Unavailable"}</dd>
      <dt>Location</dt><dd className="text-foreground">{details.location || "Unavailable"}</dd>
      <dt>Device</dt><dd className="line-clamp-2 text-foreground" title={details.userAgent || undefined}>{details.userAgent || "Unavailable"}</dd>
    </dl>
  );
}

export function AdminNotificationBell({ initialData }: { initialData: NotificationData }) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (response.ok) setData(await response.json() as NotificationData);
      } catch {
        // Keep showing the last successfully loaded notifications while offline.
      }
    };
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const markOneRead = (id: number) => startTransition(async () => {
    await readNotification(id);
    setData((current) => ({
      unreadCount: Math.max(0, current.unreadCount - (current.notifications.find((item) => item.id === id)?.readAt ? 0 : 1)),
      notifications: current.notifications.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item),
    }));
  });

  const markAllRead = () => startTransition(async () => {
    await readAllNotifications();
    const now = new Date().toISOString();
    setData((current) => ({ unreadCount: 0, notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt || now })) }));
  });

  return (
    <details className="group/notifications relative">
      <summary className="relative flex h-10 w-10 list-none items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label={`Notifications${data.unreadCount ? `, ${data.unreadCount} unread` : ""}`}>
        <IconBell className="h-5 w-5" />
        {data.unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div><p className="font-semibold text-card-foreground">Notifications</p><p className="text-xs text-muted-foreground">Admin login alerts</p></div>
          {data.unreadCount > 0 && <button type="button" onClick={markAllRead} disabled={isPending} className="text-xs font-medium text-primary hover:text-primary-hover">Mark all read</button>}
        </div>
        <div className="max-h-[32rem] overflow-y-auto">
          {data.notifications.map((notification) => (
            <article key={notification.id} className={`border-b border-border px-4 py-3 last:border-0 ${notification.readAt ? "" : "bg-primary/5"}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${notification.readAt ? "bg-border" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-sm font-semibold text-card-foreground">{notification.title}</p><p className="text-sm text-foreground">{notification.message}</p></div>
                    {!notification.readAt && <button type="button" onClick={() => markOneRead(notification.id)} disabled={isPending} title="Mark as read" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-success"><IconCheckCircle className="h-4 w-4" /></button>}
                  </div>
                  {loginDetails(notification)}
                  <LocalDateTime value={notification.createdAt} />
                </div>
              </div>
            </article>
          ))}
          {data.notifications.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-foreground">No login notifications yet.</p>}
        </div>
      </div>
    </details>
  );
}

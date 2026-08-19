"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";

function requireAdmin(session: Awaited<ReturnType<typeof getCurrentSession>>) {
  if (!session || !["admin", "manager"].includes(session.roleKey)) throw new Error("Not authorized");
  return session;
}

export async function readNotification(notificationId: number) {
  const session = requireAdmin(await getCurrentSession());
  await markNotificationRead(session.userId, notificationId);
}

export async function readAllNotifications() {
  const session = requireAdmin(await getCurrentSession());
  await markAllNotificationsRead(session.userId);
}

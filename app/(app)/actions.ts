"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, getCurrentSession } from "@/lib/auth/session";
import { logAuditEvent, getClientIp } from "@/services/auditLogService";
import { closeLoginHistory } from "@/services/loginHistoryService";

async function endSession(inactive = false) {
  const session = await getCurrentSession();
  if (session) {
    if (session.loginHistoryId) await closeLoginHistory(session.loginHistoryId, session.userId);
    await logAuditEvent({
      eventType: "logout",
      description: inactive
        ? `${session.name} was logged out after 30 minutes of inactivity`
        : `${session.name} logged out`,
      actorId: session.userId,
      actorEmail: session.email,
      ipAddress: await getClientIp(),
    });
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function logout() {
  await endSession();
}

export async function logoutForInactivity() {
  await endSession(true);
}

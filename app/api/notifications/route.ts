import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { listNotifications } from "@/services/notificationService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || !["admin", "manager"].includes(session.roleKey)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  return NextResponse.json(await listNotifications(session.userId));
}

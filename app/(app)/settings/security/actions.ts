"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { setUserTwoFactorEnabled } from "@/services/userService";

export async function updateTwoFactorSetting(formData: FormData) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.roleKey === "agent") redirect("/settings/security");

  const enabled = formData.get("enabled") === "true";
  await setUserTwoFactorEnabled(session.userId, enabled);
  redirect(`/settings/security?saved=${enabled ? "enabled" : "disabled"}`);
}

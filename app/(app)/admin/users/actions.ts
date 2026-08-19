"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { createUser, replaceUserAccessLocations, setUserActive, updateUser } from "@/services/userService";
import { logAuditEvent, getClientIp } from "@/services/auditLogService";
import { getPlaceGeoDetails } from "@/lib/geo";
import { meetsPasswordPolicy } from "@/lib/auth/password";

export async function createUserAction(formData: FormData) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.manage")) throw new Error("Not authorized");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const roleId = Number(formData.get("roleId"));
  const managedById = Number(formData.get("managedById"));
  const accessLabels = formData.getAll("accessLocation").map((value) => String(value).trim());
  const accessPlaceIds = formData.getAll("accessPlaceId").map((value) => String(value).trim());
  const accessRadii = formData.getAll("accessRadiusKm").map(Number);

  if (!name || !email || !meetsPasswordPolicy(password) || !roleId || !managedById || accessLabels.some((label, index) => !label || !accessPlaceIds[index] || accessRadii[index] < 1 || accessRadii[index] > 500)) {
    redirect(
      `/admin/users/new?error=${encodeURIComponent(
        "Complete all required fields. Passwords need at least 8 characters, including uppercase, lowercase, number, and symbol"
      )}`
    );
  }

  let createdUserId: number;
  try {
    const details = await Promise.all(accessPlaceIds.map(getPlaceGeoDetails));
    const locations = details.map((detail, index) => {
      if (!detail.location) throw new Error("Select every access location from Google Places");
      return { label: accessLabels[index], placeId: accessPlaceIds[index], latitude: detail.location.latitude, longitude: detail.location.longitude, radiusKm: accessRadii[index] };
    });
    const primary = locations[0];
    const created = await createUser({ name, email, password, roleId, accessLocation: primary?.label ?? null, accessPlaceId: primary?.placeId ?? null, accessLatitude: primary?.latitude ?? null, accessLongitude: primary?.longitude ?? null, accessRadiusKm: primary?.radiusKm ?? 25, createdBy: managedById });
    createdUserId = created.id;
    await replaceUserAccessLocations(created.id, locations);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create user";
    redirect(`/admin/users/new?error=${encodeURIComponent(msg)}`);
  }

  await logAuditEvent({
    eventType: "user_created",
    description: `${session!.name} created user ${name} (${email})`,
    actorId: session!.userId,
    actorEmail: session!.email,
    targetUserId: createdUserId,
    ipAddress: await getClientIp(),
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserAction(userId: number, formData: FormData) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.manage")) throw new Error("Not authorized");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const roleId = Number(formData.get("roleId"));
  const managedById = Number(formData.get("managedById"));
  const accessLabels = formData.getAll("accessLocation").map((value) => String(value).trim());
  const accessPlaceIds = formData.getAll("accessPlaceId").map((value) => String(value).trim());
  const accessRadii = formData.getAll("accessRadiusKm").map(Number);
  const editPath = `/admin/users/${userId}/edit`;

  if (!userId || !name || !email || !roleId || !managedById || accessLabels.some((label, index) => !label || !accessPlaceIds[index] || accessRadii[index] < 1 || accessRadii[index] > 500)) {
    redirect(`${editPath}?error=${encodeURIComponent("Name, email, role, and manager are required. Any added access location must be complete")}`);
  }
  if (password && password.length < 8) {
    redirect(`${editPath}?error=${encodeURIComponent("A new password must be at least 8 characters")}`);
  }

  try {
    const details = await Promise.all(accessPlaceIds.map(getPlaceGeoDetails));
    const locations = details.map((detail, index) => {
      if (!detail.location) throw new Error("Select every access location from Google Places");
      return { label: accessLabels[index], placeId: accessPlaceIds[index], latitude: detail.location.latitude, longitude: detail.location.longitude, radiusKm: accessRadii[index] };
    });
    const primary = locations[0];
    await updateUser(userId, {
      name,
      email,
      password: password || undefined,
      roleId,
      accessLocation: primary?.label ?? null,
      accessPlaceId: primary?.placeId ?? null,
      accessLatitude: primary?.latitude ?? null,
      accessLongitude: primary?.longitude ?? null,
      accessRadiusKm: primary?.radiusKm ?? 25,
      createdBy: managedById,
    });
    await replaceUserAccessLocations(userId, locations);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update user";
    redirect(`${editPath}?error=${encodeURIComponent(msg)}`);
  }

  await logAuditEvent({
    eventType: "role_updated",
    description: `${session!.name} updated user ${name} (${email})`,
    actorId: session!.userId,
    actorEmail: session!.email,
    targetUserId: userId,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/admin/users");
  revalidatePath(editPath);
  redirect("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "users.manage")) throw new Error("Not authorized");

  const userId = Number(formData.get("userId"));
  const nextActive = formData.get("nextActive") === "true";
  await setUserActive(userId, nextActive);
  await logAuditEvent({
    eventType: nextActive ? "user_activated" : "user_deactivated",
    description: `${session!.name} ${nextActive ? "activated" : "deactivated"} user #${userId}`,
    actorId: session!.userId,
    actorEmail: session!.email,
    targetUserId: userId,
    ipAddress: await getClientIp(),
  });
  revalidatePath("/admin/users");
}

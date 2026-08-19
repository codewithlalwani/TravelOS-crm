"use server";

import { redirect } from "next/navigation";
import { findUserByEmail, recordUserLoginLocation } from "@/services/userService";
import { verifyPassword } from "@/lib/auth/password";
import { clearLoginChallengeCookie, getLoginChallengeId, setLoginChallengeCookie, setSessionCookie } from "@/lib/auth/session";
import { logAuditEvent, getClientIp } from "@/services/auditLogService";
import { distanceKm, geolocateIp } from "@/lib/geo/geofence";
import { createLoginHistory } from "@/services/loginHistoryService";
import { notifyAdminsOfLogin } from "@/services/notificationService";
import { headers } from "next/headers";
import { createAndSendLoginOtp, verifyLoginOtp } from "@/services/loginOtpService";
import { findUserById } from "@/services/userService";
import type { User } from "@/models/User";
import type { Role } from "@/models/Role";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  const remember = formData.get("remember") != null;
  const ipAddress = await getClientIp();
  const userAgent = (await headers()).get("user-agent");
  const ipPoint = await geolocateIp(ipAddress).catch(() => null);
  const latitudeRaw = String(formData.get("latitude") || "");
  const longitudeRaw = String(formData.get("longitude") || "");
  const accuracyRaw = String(formData.get("locationAccuracy") || "");
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  const accuracy = Number(accuracyRaw);

  const fail = async (message: string, userId: number | null = null) => {
    await createLoginHistory({
      userId,
      ipAddress,
      loginId: email || "(no email)",
      loginStatus: false,
      ipCountry: ipPoint?.country,
      ipCity: ipPoint?.city,
      failureReason: message,
    });
    await logAuditEvent({
      eventType: "login_failed",
      description: `Failed login attempt for ${email || "(no email)"}`,
      actorId: userId,
      actorEmail: email || null,
      ipAddress,
    });
    const url = `/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`;
    redirect(url);
  };

  if (!email || !password) {
    await fail("Email and password are required");
    return;
  }

  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    await fail("Invalid email or password", user?.id ?? null);
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await fail("Invalid email or password", user.id);
    return;
  }

  const role = user.roleRecord!;
  const requiresLocation = role.key === "agent" || role.key === "manager";
  const hasValidLocation =
    Boolean(latitudeRaw && longitudeRaw && accuracyRaw) &&
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    Number.isFinite(accuracy) && accuracy >= 0;
  const accessLocations = user.accessLocations ?? [];
  if (requiresLocation && accessLocations.length > 0) {
    const gpsPoint = hasValidLocation ? { latitude, longitude } : null;
    const gpsMatches = gpsPoint
      ? accessLocations.map((location) => ({ location, distance: distanceKm({ latitude: Number(location.latitude), longitude: Number(location.longitude) }, gpsPoint) })).sort((a, b) => a.distance - b.distance)
      : [];
    const ipMatches = ipPoint
      ? accessLocations.map((location) => ({ location, distance: distanceKm({ latitude: Number(location.latitude), longitude: Number(location.longitude) }, ipPoint) })).sort((a, b) => a.distance - b.distance)
      : [];
    const gpsMatch = gpsMatches[0] ?? null;
    const ipMatch = ipMatches[0] ?? null;

    if (gpsPoint && gpsMatch) {
      const radiusKm = Math.max(1, Number(gpsMatch.location.radiusKm));
      const accuracyAllowanceKm = Math.min(5, accuracy / 1000);
      if (gpsMatch.distance > radiusKm + accuracyAllowanceKm) {
        await fail("Login blocked: your GPS location is outside all allowed access areas", user.id);
        return;
      }

      // GPS remains authoritative, but a very distant IP result indicates a VPN/proxy or
      // inconsistent network and is blocked instead of silently accepting the mismatch.
      if (ipMatch && ipMatch.distance > Math.max(100, Number(ipMatch.location.radiusKm) * 3)) {
        await fail("Login blocked: GPS and IP locations do not match", user.id);
        return;
      }

      await recordUserLoginLocation(user.id, {
        latitude,
        longitude,
        accuracy,
        ipLatitude: ipPoint?.latitude ?? null,
        ipLongitude: ipPoint?.longitude ?? null,
        method: "gps",
        distanceKm: gpsMatch.distance,
      });
    } else if (ipPoint && ipMatch) {
      if (ipMatch.distance > Number(ipMatch.location.radiusKm)) {
        await fail("Login blocked: your IP location is outside all allowed access areas", user.id);
        return;
      }
      await recordUserLoginLocation(user.id, {
        latitude: ipPoint.latitude,
        longitude: ipPoint.longitude,
        accuracy: null,
        ipLatitude: ipPoint.latitude,
        ipLongitude: ipPoint.longitude,
        method: "ip",
        distanceKm: ipMatch.distance,
      });
    } else {
      await fail("Location could not be verified by GPS or IP. Enable location access and try again", user.id);
      return;
    }
  } else if (hasValidLocation) {
    await recordUserLoginLocation(user.id, {
      latitude,
      longitude,
      accuracy,
      ipLatitude: null,
      ipLongitude: null,
      method: "gps",
      distanceKm: 0,
    });
  }

  const requiresOtp = role.key === "agent" || user.twoFactorEnabled;
  if (!requiresOtp) {
    await completeLogin({
      user,
      role,
      remember,
      next,
      ipAddress,
      ipCountry: ipPoint?.country ?? null,
      ipCity: ipPoint?.city ?? null,
      userAgent,
    });
    return;
  }

  let otp: Awaited<ReturnType<typeof createAndSendLoginOtp>>;
  try {
    otp = await createAndSendLoginOtp({
      user,
      remember,
      nextPath: safeNextPath(next),
      ipAddress,
      ipCountry: ipPoint?.country ?? null,
      ipCity: ipPoint?.city ?? null,
      userAgent,
    });
  } catch (error) {
    await fail(error instanceof Error ? error.message : "Could not send the verification code", user.id);
    return;
  }
  await setLoginChallengeCookie(otp.challengeId);
  redirect(`/login/otp?sent=${encodeURIComponent(otp.destinationEmail)}`);
}

export async function verifyOtpAction(formData: FormData) {
  const challengeId = await getLoginChallengeId();
  if (!challengeId) redirect("/login?error=Your login request has expired");
  const code = String(formData.get("code") || "").trim();
  let challenge: Awaited<ReturnType<typeof verifyLoginOtp>>;
  let user: Awaited<ReturnType<typeof findUserById>>;
  try {
    challenge = await verifyLoginOtp(challengeId, code);
    user = await findUserById(challenge.userId);
    if (!user?.isActive || !user.roleRecord) throw new Error("This account can no longer sign in");
  } catch (error) {
    redirect(`/login/otp?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not verify OTP")}`);
  }
  await clearLoginChallengeCookie();
  await completeLogin({
    user,
    role: user.roleRecord!,
    remember: challenge.remember,
    next: challenge.nextPath,
    ipAddress: challenge.ipAddress,
    ipCountry: challenge.ipCountry,
    ipCity: challenge.ipCity,
    userAgent: challenge.userAgent,
  });
}

async function completeLogin({ user, role, remember, next, ipAddress, ipCountry, ipCity, userAgent }: {
  user: User;
  role: Role;
  remember: boolean;
  next: string;
  ipAddress: string | null;
  ipCountry: string | null;
  ipCity: string | null;
  userAgent: string | null;
}) {
  const history = await createLoginHistory({
    userId: user.id,
    ipAddress,
    loginId: user.email,
    loginStatus: true,
    ipCountry,
    ipCity,
  });
  await setSessionCookie(
    {
      userId: user.id,
      roleId: role.id,
      roleKey: role.key,
      roleName: role.name,
      name: user.name,
      email: user.email,
      loginHistoryId: history.id,
    },
    { remember },
  );
  await logAuditEvent({
    eventType: "login_success",
    description: `${user.name} logged in`,
    actorId: user.id,
    actorEmail: user.email,
    ipAddress,
  });
  try {
    await notifyAdminsOfLogin({
      actorUserId: user.id,
      name: user.name,
      email: user.email,
      role: role.name,
      ipAddress,
      location: [ipCity, ipCountry].filter(Boolean).join(", ") || null,
      userAgent,
      loginTime: history.loginTime,
    });
  } catch (error) {
    // A notification outage must not prevent an otherwise valid login.
    console.error("Failed to create admin login notification", error);
  }
  redirect(safeNextPath(next));
}

function safeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

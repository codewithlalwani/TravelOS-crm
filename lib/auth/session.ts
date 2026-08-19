import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface SessionPayload {
  userId: number;
  roleId: number;
  roleKey: string;
  roleName: string;
  name: string;
  email: string;
  loginHistoryId?: number;
}

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "fc_session";
export const LOGIN_CHALLENGE_COOKIE_NAME = "fc_login_challenge";

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

/** Default session length; "remember me" extends it to 30 days. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const REMEMBERED_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function signSession(payload: SessionPayload, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): string {
  return jwt.sign(payload, secret(), { expiresIn: maxAgeSeconds });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  payload: SessionPayload,
  options: { remember?: boolean } = {},
): Promise<void> {
  const maxAge = options.remember ? REMEMBERED_MAX_AGE_SECONDS : SESSION_MAX_AGE_SECONDS;
  const token = signSession(payload, maxAge);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Must track the protocol the app is actually served over, not NODE_ENV —
    // `secure: true` on a plain-HTTP deployment (e.g. http://<ip>:3000) makes
    // browsers silently drop the cookie, which looks like an instant logout
    // on the very next navigation.
    secure: (process.env.APP_BASE_URL || "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function setLoginChallengeCookie(challengeId: string): Promise<void> {
  const store = await cookies();
  store.set(LOGIN_CHALLENGE_COOKIE_NAME, challengeId, {
    httpOnly: true,
    secure: (process.env.APP_BASE_URL || "").startsWith("https://"),
    sameSite: "strict",
    path: "/login",
    maxAge: 60 * 10,
  });
}

export async function getLoginChallengeId(): Promise<string | null> {
  return (await cookies()).get(LOGIN_CHALLENGE_COOKIE_NAME)?.value ?? null;
}

export async function clearLoginChallengeCookie(): Promise<void> {
  (await cookies()).set(LOGIN_CHALLENGE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: (process.env.APP_BASE_URL || "").startsWith("https://"),
    sameSite: "strict",
    path: "/login",
    maxAge: 0,
  });
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

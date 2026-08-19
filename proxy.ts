import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "fc_session";

function readSession(request: NextRequest): { roleKey?: string } | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as { roleKey?: string };
  } catch {
    return null;
  }
}

/**
 * Only handles authentication (logged in or not) here. Which specific
 * screens/actions a role may reach is granular per-permission and decided
 * page-by-page via lib/auth/rbac.ts, not by role key at this coarse layer.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSession(request);

  const isProtected = pathname.startsWith("/bookings") || pathname.startsWith("/admin");
  const isLoginPage = pathname === "/login";

  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/bookings/flights", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bookings/:path*", "/admin/:path*", "/login"],
};

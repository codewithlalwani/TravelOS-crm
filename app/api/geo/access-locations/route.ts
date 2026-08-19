import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { searchPlaces } from "@/lib/geo";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const permissions = await getPermissions(session);
  if (!session || !can(permissions, "users.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    return NextResponse.json({ suggestions: await searchPlaces(query) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Location search failed" },
      { status: 502 }
    );
  }
}

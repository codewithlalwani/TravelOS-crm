import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { getFlightSearchAdapter } from "@/lib/flights";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!session || !can(perms, "flights.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await getFlightSearchAdapter().searchAirports(query);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Airport search failed" },
      { status: 502 }
    );
  }
}

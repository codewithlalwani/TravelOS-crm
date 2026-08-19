import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlaceGeoDetails } from "@/lib/geo";

// GET /api/geo/cities/details?placeId=... — resolves the country and state for a picked city
// suggestion, so City fields can auto-fill their paired Country/State fields.
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const placeId = (new URL(request.url).searchParams.get("placeId") || "").trim();
  if (!placeId) return NextResponse.json({ error: "placeId is required" }, { status: 400 });

  try {
    const details = await getPlaceGeoDetails(placeId);
    return NextResponse.json(details);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Place details failed" },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { searchCities } from "@/lib/geo";

// GET /api/geo/cities?q=par — Google Places (cities) suggestions, shared by every City field
// across the Flight, Hotel, and Car booking wizards.
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await searchCities(query);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "City search failed" },
      { status: 502 }
    );
  }
}

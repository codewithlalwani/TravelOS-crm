import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { searchCities, searchLocations, type LocationSuggestion } from "@/lib/geo";

function mergeSuggestions(
  query: string,
  cities: LocationSuggestion[],
  locations: LocationSuggestion[]
): LocationSuggestion[] {
  const needle = query.toLocaleLowerCase();
  const seen = new Set<string>();

  return [...cities, ...locations]
    .filter((suggestion) => suggestion.mainText.toLocaleLowerCase().startsWith(needle))
    .filter((suggestion) => {
      const key = suggestion.description.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!session || !can(perms, "hotels.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ suggestions: [] });

  try {
    // Google Places gives strong city-prefix results (for example "los" -> "Los Angeles"),
    // while Nominatim also supplies lodging properties. Keep either source usable if the
    // other one is temporarily unavailable.
    const [citiesResult, locationsResult] = await Promise.allSettled([
      searchCities(query),
      searchLocations(query),
    ]);
    if (citiesResult.status === "rejected" && locationsResult.status === "rejected") {
      throw citiesResult.reason;
    }

    const suggestions = mergeSuggestions(
      query,
      citiesResult.status === "fulfilled" ? citiesResult.value : [],
      locationsResult.status === "fulfilled" ? locationsResult.value : []
    );
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Location search failed" },
      { status: 502 }
    );
  }
}

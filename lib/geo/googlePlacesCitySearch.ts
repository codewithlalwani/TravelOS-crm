import type { LocationSuggestion } from "./LocationSuggestion";

const GOOGLE_PLACES_AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

interface RawPrediction {
  description: string;
  place_id?: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
}

interface RawResponse {
  status: string;
  predictions?: RawPrediction[];
  error_message?: string;
}

/**
 * Google Places Autocomplete restricted to `(cities)` — the single suggestions source for
 * every City field in the app (flight segment Dep/Arr City, billing address city), per
 * product decision to standardize instead of mixing Nominatim/free text per field.
 */
export async function searchCities(query: string): Promise<LocationSuggestion[]> {
  return searchGooglePlaces(query, "(cities)");
}

/** Google Places suggestions for offices, neighbourhoods, cities, and addresses. */
export async function searchPlaces(query: string): Promise<LocationSuggestion[]> {
  return searchGooglePlaces(query);
}

async function searchGooglePlaces(query: string, types?: string): Promise<LocationSuggestion[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const url = new URL(GOOGLE_PLACES_AUTOCOMPLETE_URL);
  url.searchParams.set("input", query);
  if (types) url.searchParams.set("types", types);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`City search failed (${response.status})`);
  const json = (await response.json()) as RawResponse;

  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(json.error_message || `City search failed (${json.status})`);
  }

  return (json.predictions ?? []).map((p) => {
    const mainText = p.structured_formatting?.main_text ?? p.description;
    const secondaryText = p.structured_formatting?.secondary_text ?? null;
    return {
      description: p.description,
      mainText,
      secondaryText,
      type: types === "(cities)" ? "city" : "place",
      placeId: p.place_id ?? null,
    };
  });
}

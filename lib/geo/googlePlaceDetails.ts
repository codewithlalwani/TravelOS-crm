const GOOGLE_PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

export interface PlaceCountry {
  /** ISO 3166-1 alpha-2, e.g. "IN" — matches the `code` used by CountryAutocomplete/country-code.json. */
  code: string;
  name: string;
}

export interface PlaceGeoDetails {
  country: PlaceCountry | null;
  /** State/province long name, e.g. "Karnataka". */
  state: string | null;
  location: { latitude: number; longitude: number } | null;
}

interface RawAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface RawResponse {
  status: string;
  result?: {
    address_components?: RawAddressComponent[];
    geometry?: { location?: { lat?: number; lng?: number } };
  };
  error_message?: string;
}

/**
 * Resolves the country and state for a Google Places `place_id` via Place Details, so picking
 * a city suggestion can auto-fill the paired Country/State fields with the exact values Google
 * assigns (avoids guessing from abbreviated text like "USA"/"UK" in the autocomplete description).
 */
export async function getPlaceGeoDetails(placeId: string): Promise<PlaceGeoDetails> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const url = new URL(GOOGLE_PLACE_DETAILS_URL);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "address_component,geometry");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Place details failed (${response.status})`);
  const json = (await response.json()) as RawResponse;

  if (json.status !== "OK") {
    if (json.status === "ZERO_RESULTS" || json.status === "NOT_FOUND") return { country: null, state: null, location: null };
    throw new Error(json.error_message || `Place details failed (${json.status})`);
  }

  const components = json.result?.address_components ?? [];
  const country = components.find((c) => c.types.includes("country"));
  const state = components.find((c) => c.types.includes("administrative_area_level_1"));
  const point = json.result?.geometry?.location;

  return {
    country: country ? { code: country.short_name, name: country.long_name } : null,
    state: state ? state.long_name : null,
    location: typeof point?.lat === "number" && typeof point.lng === "number"
      ? { latitude: point.lat, longitude: point.lng }
      : null,
  };
}

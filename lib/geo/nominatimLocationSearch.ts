import type { LocationSuggestion } from "./LocationSuggestion";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

// Nominatim's usage policy requires every request to identify the calling application via
// User-Agent (there's no browser Referer on a server-side fetch) — https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "RinnovarTravelCRM/1.0";

// Keep destination-level hits plus lodging properties. Other POIs/businesses are intentionally
// excluded so the hotel booking autocomplete does not fill up with unrelated establishments.
const PLACE_TYPES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "municipality",
  "county",
  "state",
  "island",
  "country",
]);

const HOTEL_TYPES = new Set([
  "hotel",
  "motel",
  "resort",
  "hostel",
  "guest_house",
  "apartment",
  "chalet",
]);

interface RawAddress {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
}

interface RawResult {
  name?: string;
  display_name?: string;
  category?: string;
  addresstype?: string;
  type?: string;
  address?: RawAddress;
}

function mapResult(raw: RawResult): LocationSuggestion | null {
  const resultType = raw.addresstype ?? raw.type ?? null;
  // For POIs Nominatim commonly reports addresstype="tourism" and the useful subtype
  // (hotel/resort/etc.) in `type`.
  const isHotel = raw.category === "tourism" && raw.type != null && HOTEL_TYPES.has(raw.type);
  const name = isHotel
    ? raw.name
    : raw.address?.city ?? raw.address?.town ?? raw.address?.village ?? raw.address?.state ?? raw.address?.country;
  if (!name) return null;

  const country = raw.address?.country ?? null;
  const description = isHotel
    ? raw.display_name ?? name
    : country && country !== name
      ? `${name}, ${country}`
      : name;
  const secondaryText = isHotel
    ? raw.display_name?.replace(new RegExp(`^${escapeRegExp(name)}\\s*,?\\s*`, "i"), "") || null
    : country && country !== name
      ? country
      : null;

  return {
    description,
    mainText: name,
    secondaryText,
    type: isHotel ? raw.type ?? "hotel" : resultType,
    placeId: null,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * OpenStreetMap's Nominatim `/search` endpoint — a free, key-less geocoder — backs the
 * hotel/destination autocomplete. It's rate-limited to ~1 req/sec per the usage policy
 * above, which is fine for a single admin's debounced typing.
 */
export async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "20");
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Location search failed (${response.status})`);
  const results = (await response.json()) as RawResult[];

  // Nominatim can fall back to fuzzy matching. This autocomplete is deliberately prefix-only:
  // typing "mar" should show "Marriott" and "Margao", not names containing "mar" later on.
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const suggestions: LocationSuggestion[] = [];
  for (const raw of results) {
    const destinationType = raw.addresstype ?? raw.type;
    const isDestination = destinationType != null && PLACE_TYPES.has(destinationType);
    const isHotel = raw.category === "tourism" && raw.type != null && HOTEL_TYPES.has(raw.type);
    if (!isDestination && !isHotel) continue;
    const mapped = mapResult(raw);
    if (!mapped || seen.has(mapped.description)) continue;
    if (!mapped.mainText.toLowerCase().startsWith(needle)) continue;
    seen.add(mapped.description);
    suggestions.push(mapped);
  }
  return suggestions;
}

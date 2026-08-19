import type { HotelSearchAdapter, HotelSearchParams, HotelSearchResult, HotelProperty } from "./HotelSearchAdapter";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

// SerpApi's google_hotels `rating` filter is a bucket code, not the raw threshold.
const RATING_CODE: Record<number, string> = { 3.5: "7", 4: "8", 4.5: "9" };

interface RawImage {
  thumbnail?: string;
  original_image?: string;
}

interface RawRate {
  lowest?: string;
  extracted_lowest?: number;
}

interface RawProperty {
  type?: string;
  name?: string;
  description?: string;
  link?: string;
  property_token?: string;
  hotel_class?: string;
  extracted_hotel_class?: number;
  rate_per_night?: RawRate;
  total_rate?: RawRate;
  images?: RawImage[];
  overall_rating?: number;
  reviews?: number;
  amenities?: string[];
}

interface RawHotelSearchResponse {
  properties?: RawProperty[];
  error?: string;
}

function mapProperty(raw: RawProperty): HotelProperty {
  return {
    name: raw.name ?? "",
    description: raw.description ?? null,
    type: raw.type ?? null,
    hotelClass: typeof raw.extracted_hotel_class === "number" ? raw.extracted_hotel_class : null,
    overallRating: typeof raw.overall_rating === "number" ? raw.overall_rating : null,
    reviews: typeof raw.reviews === "number" ? raw.reviews : null,
    pricePerNight: typeof raw.rate_per_night?.extracted_lowest === "number" ? raw.rate_per_night.extracted_lowest : null,
    totalPrice: typeof raw.total_rate?.extracted_lowest === "number" ? raw.total_rate.extracted_lowest : null,
    thumbnail: raw.images?.[0]?.thumbnail ?? null,
    amenities: raw.amenities ?? [],
    propertyToken: raw.property_token ?? null,
    link: raw.link ?? null,
  };
}

/**
 * SerpApi's `google_hotels` engine: a single free-text location query (no separate
 * autocomplete step like flights) plus check-in/check-out dates returns a ranked
 * `properties` list directly — no multi-step token exchange required.
 */
export class SerpApiHotelAdapter implements HotelSearchAdapter {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("SERPAPI_API_KEY is not configured");
    this.apiKey = apiKey;
  }

  async searchHotels(params: HotelSearchParams): Promise<HotelSearchResult> {
    const url = new URL(SERPAPI_BASE_URL);
    url.searchParams.set("engine", "google_hotels");
    url.searchParams.set("q", params.query);
    url.searchParams.set("check_in_date", params.checkInDate);
    url.searchParams.set("check_out_date", params.checkOutDate);
    url.searchParams.set("adults", String(params.adults));
    if (params.children) url.searchParams.set("children", String(params.children));
    url.searchParams.set("currency", params.currency);

    if (params.minPrice) url.searchParams.set("min_price", String(params.minPrice));
    if (params.maxPrice) url.searchParams.set("max_price", String(params.maxPrice));
    if (params.hotelClass?.length) url.searchParams.set("hotel_class", params.hotelClass.join(","));
    if (params.minRating) {
      const code = RATING_CODE[params.minRating];
      if (code) url.searchParams.set("rating", code);
    }

    url.searchParams.set("api_key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`SerpApi hotel search failed (${response.status})`);
    const json = (await response.json()) as RawHotelSearchResponse;
    if (json.error) throw new Error(json.error);

    return { properties: (json.properties ?? []).map(mapProperty) };
  }
}

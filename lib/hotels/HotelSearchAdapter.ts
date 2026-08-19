export interface HotelSearchParams {
  query: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  currency: string;

  minPrice?: number;
  maxPrice?: number;
  /** Star ratings to include, e.g. [4, 5]. */
  hotelClass?: number[];
  /** Minimum guest rating: 3.5, 4, or 4.5. */
  minRating?: 3.5 | 4 | 4.5;
}

export interface HotelProperty {
  name: string;
  description: string | null;
  type: string | null;
  hotelClass: number | null;
  overallRating: number | null;
  reviews: number | null;
  pricePerNight: number | null;
  totalPrice: number | null;
  thumbnail: string | null;
  amenities: string[];
  propertyToken: string | null;
  link: string | null;
}

export interface HotelSearchResult {
  properties: HotelProperty[];
}

/**
 * Boundary for the hotel-search provider, mirroring FlightSearchAdapter: callers only see
 * these types, so swapping SerpApi for another provider only touches the implementation file.
 */
export interface HotelSearchAdapter {
  searchHotels(params: HotelSearchParams): Promise<HotelSearchResult>;
}

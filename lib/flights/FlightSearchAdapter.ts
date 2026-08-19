import type { CabinClass, TripType } from "../booking/flightOptions";

export interface AirportSuggestion {
  code: string;
  name: string;
  city: string | null;
  country: string | null;
}

export type StopsFilter = "any" | "nonstop" | "1stop";

export interface FlightSearchParams {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  returnDate?: string;
  tripType: TripType;
  cabinClass: CabinClass;
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
  currency: string;
  /** Pass the departure_token from a chosen outbound itinerary to fetch its matching return flights. */
  departureToken?: string;
  multiCityLegs?: Array<{ departureId: string; arrivalId: string; date: string }>;

  stops?: StopsFilter;
  /** IATA airline codes to restrict results to. */
  includeAirlines?: string[];
  /** Number of bags SerpApi should factor into fares/availability. */
  bags?: number;
  maxPrice?: number;
  /** SerpApi "min,max" departure-hour window (0-24), applied to the outbound leg. */
  outboundTimes?: string;
  /** SerpApi "min,max" departure-hour window (0-24), applied to the return leg. */
  returnTimes?: string;
  /** Only return itineraries with lower-than-typical CO2e emissions. */
  emissions?: boolean;
  /** Connecting airport IATA codes to exclude as layovers. */
  excludeConns?: string[];
  /** Max total duration in minutes. */
  maxDuration?: number;
}

export interface FlightLeg {
  flightNumber: string | null;
  airlineCode: string | null;
  airline: string;
  airlineLogo: string | null;
  departureAirport: string;
  departureAirportName: string | null;
  departureCity: string | null;
  departureCountry: string | null;
  departureCountryCode: string | null;
  departureDate: string;
  departureTime: string | null;
  arrivalAirport: string;
  arrivalAirportName: string | null;
  arrivalCity: string | null;
  arrivalCountry: string | null;
  arrivalCountryCode: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  travelClass: string | null;
  durationMinutes: number | null;
  overnight: boolean;
}

export interface FlightItinerary {
  legs: FlightLeg[];
  totalDurationMinutes: number | null;
  price: number | null;
  currency: string;
  type: string;
  departureToken: string | null;
  bookingToken: string | null;
  /** Grams of CO2e for this itinerary, and the typical figure for the same route, per SerpApi. */
  carbonEmissionsGrams: number | null;
  typicalCarbonEmissionsGrams: number | null;
  carbonEmissionsDifferencePercent: number | null;
}

export interface FlightSearchResult {
  bestFlights: FlightItinerary[];
  otherFlights: FlightItinerary[];
}

/**
 * Boundary for the flight-search provider, mirroring PaymentGatewayAdapter: callers only see
 * these types, so swapping SerpApi for another provider only touches the implementation file.
 */
export interface FlightSearchAdapter {
  searchAirports(query: string): Promise<AirportSuggestion[]>;
  searchFlights(params: FlightSearchParams): Promise<FlightSearchResult>;
}

import type { CabinClass } from "../booking/flightOptions";
import { airports } from "@nwpr/airport-codes";
import countryCodes from "../../app/utils/country-code.json";
import type {
  FlightSearchAdapter,
  AirportSuggestion,
  FlightSearchParams,
  FlightSearchResult,
  FlightItinerary,
  FlightLeg,
} from "./FlightSearchAdapter";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";

const airportByIata = new Map(
  airports
    .filter((airport) => airport.iata)
    .map((airport) => [airport.iata!.toUpperCase(), airport] as const)
);
const countryCodeByName = new Map(
  (countryCodes as Array<{ name: string; code: string }>).map((country) => [country.name.toLowerCase(), country.code])
);

function searchLocalAirports(query: string): AirportSuggestion[] {
  const needle = query.trim().toLocaleLowerCase();

  return airports
    .filter((airport) => airport.iata && airport.name && airport.type === "airport")
    .map((airport) => {
      const code = airport.iata!.toLocaleLowerCase();
      const city = airport.city?.toLocaleLowerCase() ?? "";
      const name = airport.name!.toLocaleLowerCase();
      let rank = 99;

      if (code === needle) rank = 0;
      else if (code.startsWith(needle)) rank = 1;
      else if (city === needle) rank = 2;
      else if (city.startsWith(needle)) rank = 3;
      else if (name.startsWith(needle)) rank = 4;
      else if (city.includes(needle)) rank = 5;
      else if (name.includes(needle)) rank = 6;

      return { airport, rank };
    })
    .filter(({ rank }) => rank < 99)
    .sort((a, b) => a.rank - b.rank || (a.airport.city ?? "").localeCompare(b.airport.city ?? ""))
    .slice(0, 10)
    .map(({ airport }) => ({
      code: airport.iata!,
      name: airport.name!,
      city: airport.city ?? null,
      country: airport.country ?? null,
    }));
}

const TRAVEL_CLASS_CODE: Record<CabinClass, string> = {
  Economy: "1",
  "Premium Economy": "2",
  Business: "3",
  First: "4",
};

interface RawAirport {
  id: string;
  name: string;
  city?: string;
  city_id?: string;
  distance?: string;
}

interface RawAutocompleteSuggestion {
  name: string;
  type?: string;
  description?: string;
  airports?: RawAirport[];
}

interface RawAutocompleteResponse {
  suggestions?: RawAutocompleteSuggestion[];
  error?: string;
}

interface RawFlightEndpoint {
  name?: string;
  id?: string;
  time?: string;
}

interface RawFlightLeg {
  departure_airport?: RawFlightEndpoint;
  arrival_airport?: RawFlightEndpoint;
  duration?: number;
  airplane?: string;
  airline?: string;
  airline_logo?: string;
  travel_class?: string;
  flight_number?: string;
  overnight?: boolean;
}

interface RawCarbonEmissions {
  this_flight?: number;
  typical_for_this_route?: number;
  difference_percent?: number;
}

interface RawItinerary {
  flights?: RawFlightLeg[];
  total_duration?: number;
  price?: number;
  type?: string;
  departure_token?: string;
  booking_token?: string;
  carbon_emissions?: RawCarbonEmissions;
}

interface RawFlightSearchResponse {
  best_flights?: RawItinerary[];
  other_flights?: RawItinerary[];
  error?: string;
}

function splitDateTime(value: string | undefined): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null };
  const [date, time] = value.split(" ");
  return { date: date ?? null, time: time ? time.slice(0, 5) : null };
}

function mapLeg(raw: RawFlightLeg): FlightLeg {
  const dep = splitDateTime(raw.departure_airport?.time);
  const arr = splitDateTime(raw.arrival_airport?.time);
  const departureAirport = raw.departure_airport?.id?.toUpperCase() ?? "";
  const arrivalAirport = raw.arrival_airport?.id?.toUpperCase() ?? "";
  const departureLocation = airportByIata.get(departureAirport);
  const arrivalLocation = airportByIata.get(arrivalAirport);
  // flight_number is "XX 1234" — the prefix before the space is the operating airline's IATA
  // code and the remainder is the number our segments store separately (AIRLINE: "XX", Flight No: "1234").
  const [flightNumberPrefix, ...flightNumberRest] = raw.flight_number?.split(" ") ?? [];
  return {
    flightNumber: flightNumberRest.length > 0 ? flightNumberRest.join(" ") : raw.flight_number ?? null,
    airlineCode: flightNumberPrefix || null,
    airline: raw.airline ?? "",
    airlineLogo: raw.airline_logo ?? null,
    departureAirport,
    departureAirportName: raw.departure_airport?.name ?? null,
    departureCity: departureLocation?.city ?? null,
    departureCountry: departureLocation?.country ?? null,
    departureCountryCode: departureLocation?.country
      ? countryCodeByName.get(departureLocation.country.toLowerCase()) ?? null
      : null,
    departureDate: dep.date ?? "",
    departureTime: dep.time,
    arrivalAirport,
    arrivalAirportName: raw.arrival_airport?.name ?? null,
    arrivalCity: arrivalLocation?.city ?? null,
    arrivalCountry: arrivalLocation?.country ?? null,
    arrivalCountryCode: arrivalLocation?.country
      ? countryCodeByName.get(arrivalLocation.country.toLowerCase()) ?? null
      : null,
    arrivalDate: arr.date,
    arrivalTime: arr.time,
    travelClass: raw.travel_class ?? null,
    durationMinutes: typeof raw.duration === "number" ? raw.duration : null,
    overnight: Boolean(raw.overnight),
  };
}

function mapItinerary(raw: RawItinerary, currency: string): FlightItinerary {
  const emissions = raw.carbon_emissions;
  return {
    legs: (raw.flights ?? []).map(mapLeg),
    totalDurationMinutes: typeof raw.total_duration === "number" ? raw.total_duration : null,
    price: typeof raw.price === "number" ? raw.price : null,
    currency,
    type: raw.type ?? "",
    departureToken: raw.departure_token ?? null,
    bookingToken: raw.booking_token ?? null,
    carbonEmissionsGrams: typeof emissions?.this_flight === "number" ? emissions.this_flight : null,
    typicalCarbonEmissionsGrams: typeof emissions?.typical_for_this_route === "number" ? emissions.typical_for_this_route : null,
    carbonEmissionsDifferencePercent: typeof emissions?.difference_percent === "number" ? emissions.difference_percent : null,
  };
}

/**
 * SerpApi's Google Flights engines: `google_flights_autocomplete` for the airport search box,
 * `google_flights` for actual fare search. Round trips are a two-step flow — the first call
 * returns outbound itineraries carrying a `departure_token`; that token must be replayed to
 * fetch the matching return itineraries.
 */
export class SerpApiFlightAdapter implements FlightSearchAdapter {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) throw new Error("SERPAPI_API_KEY is not configured");
    this.apiKey = apiKey;
  }

  async searchAirports(query: string): Promise<AirportSuggestion[]> {
    const url = new URL(SERPAPI_BASE_URL);
    url.searchParams.set("engine", "google_flights_autocomplete");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", this.apiKey);

    let json: RawAutocompleteResponse;
    try {
      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error(`SerpApi airport search failed (${response.status})`);
      json = (await response.json()) as RawAutocompleteResponse;
      if (json.error) throw new Error(json.error);
    } catch {
      // Airport recommendations must remain usable when the provider is rate-limited,
      // unavailable, or slow. Flight fare searches still use SerpApi as before.
      return searchLocalAirports(query);
    }

    // The same airport can appear in more than one suggestion group (e.g. a city
    // group and a nearby-city group), so dedupe by IATA code before returning.
    const suggestions = new Map<string, AirportSuggestion>();
    const trimmedQuery = query.trim();
    const queryLooksLikeCode = /^[A-Za-z]{3}$/.test(trimmedQuery);

    for (const group of json.suggestions ?? []) {
      // `name` is e.g. "Nagpur, Maharashtra, India" — the last comma segment is the country.
      // `description` (e.g. "City in India") is just a category label, not reliably the country.
      const nameParts = group.name.split(",").map((p) => p.trim());
      const country = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;

      if (group.airports && group.airports.length > 0) {
        for (const airport of group.airports) {
          if (suggestions.has(airport.id)) continue;
          suggestions.set(airport.id, {
            code: airport.id,
            name: airport.name,
            city: airport.city ?? group.name,
            country,
          });
        }
        continue;
      }

      // A query that exactly matches one airport (by code or by name, e.g. "BLR" or
      // "Heathrow") comes back as a bare suggestion with no nested `airports` list and no
      // `type` (regions/states use `type: "region"` and are skipped here) — SerpApi never
      // tags it with an IATA code directly. When the typed query itself looks like a code,
      // trust it: SerpApi only resolves this shape for an exact code/name hit.
      if (group.type || !queryLooksLikeCode) continue;
      const code = trimmedQuery.toUpperCase();
      if (suggestions.has(code)) continue;

      const locationMatch = group.description?.match(/airport in (.+)$/i);
      let city: string | null = null;
      let bareCountry: string | null = null;
      if (locationMatch) {
        const locationParts = locationMatch[1].split(",").map((p) => p.trim());
        if (locationParts.length > 1) {
          [city, bareCountry] = locationParts;
        } else {
          [bareCountry] = locationParts;
        }
      }

      suggestions.set(code, {
        code,
        name: group.name,
        city,
        country: bareCountry,
      });
    }
    const remoteSuggestions = Array.from(suggestions.values());
    return remoteSuggestions.length > 0 ? remoteSuggestions : searchLocalAirports(query);
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
    const url = new URL(SERPAPI_BASE_URL);
    url.searchParams.set("engine", "google_flights");
    if (params.tripType !== "Multi City") {
      url.searchParams.set("departure_id", params.departureId);
      url.searchParams.set("arrival_id", params.arrivalId);
      url.searchParams.set("outbound_date", params.outboundDate);
    }

    if (params.tripType === "Round Trip") {
      url.searchParams.set("type", "1");
      if (params.returnDate) url.searchParams.set("return_date", params.returnDate);
    } else if (params.tripType === "Multi City") {
      url.searchParams.set("type", "3");
      url.searchParams.set(
        "multi_city_json",
        JSON.stringify((params.multiCityLegs ?? []).map((leg) => ({
          departure_id: leg.departureId,
          arrival_id: leg.arrivalId,
          date: leg.date,
        })))
      );
    } else {
      url.searchParams.set("type", "2");
    }

    url.searchParams.set("travel_class", TRAVEL_CLASS_CODE[params.cabinClass] ?? "1");
    url.searchParams.set("adults", String(params.adults));
    if (params.children) url.searchParams.set("children", String(params.children));
    if (params.infantsInSeat) url.searchParams.set("infants_in_seat", String(params.infantsInSeat));
    if (params.infantsOnLap) url.searchParams.set("infants_on_lap", String(params.infantsOnLap));
    url.searchParams.set("currency", params.currency);
    if (params.departureToken) url.searchParams.set("departure_token", params.departureToken);

    if (params.stops === "nonstop") url.searchParams.set("stops", "1");
    else if (params.stops === "1stop") url.searchParams.set("stops", "2");
    if (params.includeAirlines?.length) url.searchParams.set("include_airlines", params.includeAirlines.join(","));
    if (params.bags) url.searchParams.set("bags", String(params.bags));
    if (params.maxPrice) url.searchParams.set("max_price", String(params.maxPrice));
    if (params.outboundTimes) url.searchParams.set("outbound_times", params.outboundTimes);
    if (params.returnTimes) url.searchParams.set("return_times", params.returnTimes);
    if (params.emissions) url.searchParams.set("emissions", "1");
    if (params.excludeConns?.length) url.searchParams.set("exclude_conns", params.excludeConns.join(","));
    if (params.maxDuration) url.searchParams.set("max_duration", String(params.maxDuration));

    url.searchParams.set("api_key", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`SerpApi flight search failed (${response.status})`);
    const json = (await response.json()) as RawFlightSearchResponse;
    // SerpApi reports a plain "no results" case as `error` rather than empty arrays —
    // treat it as a valid empty result instead of surfacing it as a search failure.
    if (json.error && !/hasn't returned any results/i.test(json.error)) throw new Error(json.error);

    return {
      bestFlights: (json.best_flights ?? []).map((f) => mapItinerary(f, params.currency)),
      otherFlights: (json.other_flights ?? []).map((f) => mapItinerary(f, params.currency)),
    };
  }
}

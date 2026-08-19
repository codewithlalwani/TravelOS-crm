"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";
import { FilterPill } from "@/components/FilterPill";
import { IconAlertTriangle, IconChevronDown, IconInfo, IconSliders } from "@/components/icons";
import { CABIN_CLASS_OPTIONS, type CabinClass, type TripType } from "@/lib/booking/flightOptions";
import type { AirportSuggestion, FlightItinerary, FlightLeg, FlightSearchResult, StopsFilter } from "@/lib/flights";

export interface FlightSelection {
  tripType: TripType;
  cabinClass: CabinClass;
  origin: string;
  destination: string;
  originCountry: string | null;
  destinationCountry: string | null;
  currency: string;
  legs: FlightLeg[];
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";

interface FlightFilterState {
  stops: StopsFilter;
  airlines: string[];
  bags: number;
  maxPrice: string;
  depTimeMin: number;
  depTimeMax: number;
  emissions: boolean;
  excludeConns: string[];
  maxDurationHours: string;
}

const DEFAULT_FILTERS: FlightFilterState = {
  stops: "any",
  airlines: [],
  bags: 0,
  maxPrice: "",
  depTimeMin: 0,
  depTimeMax: 24,
  emissions: false,
  excludeConns: [],
  maxDurationHours: "",
};

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function resultItineraries(result: FlightSearchResult | null): FlightItinerary[] {
  if (!result) return [];
  return [...result.bestFlights, ...result.otherFlights];
}

function airlineOptions(result: FlightSearchResult | null): { code: string; name: string }[] {
  const byCode = new Map<string, string>();
  for (const itin of resultItineraries(result)) {
    for (const leg of itin.legs) {
      if (leg.airlineCode && !byCode.has(leg.airlineCode)) byCode.set(leg.airlineCode, leg.airline || leg.airlineCode);
    }
  }
  return Array.from(byCode.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function connectingAirportOptions(result: FlightSearchResult | null): string[] {
  const codes = new Set<string>();
  for (const itin of resultItineraries(result)) {
    itin.legs.slice(0, -1).forEach((leg) => codes.add(leg.arrivalAirport));
  }
  return Array.from(codes).sort();
}

function isFiltersActive(f: FlightFilterState): boolean {
  return (
    f.stops !== "any" ||
    f.airlines.length > 0 ||
    f.bags > 0 ||
    f.maxPrice !== "" ||
    f.depTimeMin > 0 ||
    f.depTimeMax < 24 ||
    f.emissions ||
    f.excludeConns.length > 0 ||
    f.maxDurationHours !== ""
  );
}

function activeCount(f: FlightFilterState): number {
  let n = 0;
  if (f.stops !== "any") n++;
  if (f.airlines.length > 0) n++;
  if (f.bags > 0) n++;
  if (f.maxPrice !== "") n++;
  if (f.depTimeMin > 0 || f.depTimeMax < 24) n++;
  if (f.emissions) n++;
  if (f.excludeConns.length > 0) n++;
  if (f.maxDurationHours !== "") n++;
  return n;
}

function FlightFilterBar({
  filters,
  onChange,
  airlines,
  connectingAirports,
  loading,
}: {
  filters: FlightFilterState;
  onChange: (next: FlightFilterState) => void;
  airlines: { code: string; name: string }[];
  connectingAirports: string[];
  loading: boolean;
}) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const toggle = (name: string) => setOpenFilter((cur) => (cur === name ? null : name));

  function toggleAirline(code: string) {
    const next = filters.airlines.includes(code)
      ? filters.airlines.filter((c) => c !== code)
      : [...filters.airlines, code];
    onChange({ ...filters, airlines: next });
  }

  function toggleConn(code: string) {
    const next = filters.excludeConns.includes(code)
      ? filters.excludeConns.filter((c) => c !== code)
      : [...filters.excludeConns, code];
    onChange({ ...filters, excludeConns: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        disabled={!isFiltersActive(filters) || loading}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
      >
        <IconSliders className="h-4 w-4" />
        All filters
        {activeCount(filters) > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {activeCount(filters)}
          </span>
        )}
      </button>

      <FilterPill label="Stops" active={filters.stops !== "any"} open={openFilter === "stops"} onToggle={() => toggle("stops")}>
        <div className="space-y-2">
          {([
            ["any", "Any number of stops"],
            ["nonstop", "Nonstop only"],
            ["1stop", "1 stop or fewer"],
          ] as [StopsFilter, string][]).map(([value, text]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-card-foreground">
              <input
                type="radio"
                checked={filters.stops === value}
                onChange={() => onChange({ ...filters, stops: value })}
                className="accent-primary"
              />
              {text}
            </label>
          ))}
        </div>
      </FilterPill>

      <FilterPill
        label="Airlines"
        active={filters.airlines.length > 0}
        open={openFilter === "airlines"}
        onToggle={() => toggle("airlines")}
      >
        {airlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No airlines to filter yet.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {airlines.map((a) => (
              <label key={a.code} className="flex items-center gap-2 text-sm text-card-foreground">
                <input
                  type="checkbox"
                  checked={filters.airlines.includes(a.code)}
                  onChange={() => toggleAirline(a.code)}
                  className="accent-primary"
                />
                {a.name}
              </label>
            ))}
          </div>
        )}
      </FilterPill>

      <FilterPill label="Bags" active={filters.bags > 0} open={openFilter === "bags"} onToggle={() => toggle("bags")}>
        <label className={labelClass}>Carry-on / checked bags</label>
        <input
          type="number"
          min={0}
          max={9}
          value={filters.bags}
          onChange={(e) => onChange({ ...filters, bags: Math.min(9, Math.max(0, Number(e.target.value) || 0)) })}
          className={inputClass}
        />
      </FilterPill>

      <FilterPill label="Price" active={filters.maxPrice !== ""} open={openFilter === "price"} onToggle={() => toggle("price")}>
        <label className={labelClass}>Max price (USD)</label>
        <input
          type="number"
          min={0}
          placeholder="No limit"
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          className={inputClass}
        />
      </FilterPill>

      <FilterPill
        label="Times"
        active={filters.depTimeMin > 0 || filters.depTimeMax < 24}
        open={openFilter === "times"}
        onToggle={() => toggle("times")}
      >
        <label className={labelClass}>Departure between</label>
        <div className="flex items-center gap-2 text-sm text-card-foreground">
          <select
            value={filters.depTimeMin}
            onChange={(e) => onChange({ ...filters, depTimeMin: Number(e.target.value) })}
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 25 }, (_, h) => h).map((h) => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">and</span>
          <select
            value={filters.depTimeMax}
            onChange={(e) => onChange({ ...filters, depTimeMax: Number(e.target.value) })}
            className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 25 }, (_, h) => h).map((h) => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
        </div>
      </FilterPill>

      <FilterPill label="Emissions" active={filters.emissions} open={openFilter === "emissions"} onToggle={() => toggle("emissions")}>
        <label className="flex items-center gap-2 text-sm text-card-foreground">
          <input
            type="checkbox"
            checked={filters.emissions}
            onChange={(e) => onChange({ ...filters, emissions: e.target.checked })}
            className="accent-primary"
          />
          Show flights with lower CO2e emissions only
        </label>
      </FilterPill>

      <FilterPill
        label="Connecting airports"
        active={filters.excludeConns.length > 0}
        open={openFilter === "conns"}
        onToggle={() => toggle("conns")}
        align="right"
      >
        {connectingAirports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No connecting airports to exclude yet.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto">
            <p className="mb-1 text-xs text-muted-foreground">Exclude flights connecting through:</p>
            {connectingAirports.map((code) => (
              <label key={code} className="flex items-center gap-2 text-sm text-card-foreground">
                <input
                  type="checkbox"
                  checked={filters.excludeConns.includes(code)}
                  onChange={() => toggleConn(code)}
                  className="accent-primary"
                />
                {code}
              </label>
            ))}
          </div>
        )}
      </FilterPill>

      <FilterPill
        label="Duration"
        active={filters.maxDurationHours !== ""}
        open={openFilter === "duration"}
        onToggle={() => toggle("duration")}
        align="right"
      >
        <label className={labelClass}>Max duration (hours)</label>
        <input
          type="number"
          min={1}
          placeholder="No limit"
          value={filters.maxDurationHours}
          onChange={(e) => onChange({ ...filters, maxDurationHours: e.target.value })}
          className={inputClass}
        />
      </FilterPill>
    </div>
  );
}

function formatDuration(minutes: number | null): string | null {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} hr ${m} min`;
}

function stopsLabel(legs: FlightLeg[]): string {
  const stops = legs.length - 1;
  if (stops === 0) return "Nonstop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

/** Minutes between one leg's arrival and the next leg's departure, e.g. for a layover duration. */
function minutesBetween(fromDate: string | null, fromTime: string | null, toDate: string | null, toTime: string | null): number | null {
  if (!fromDate || !fromTime || !toDate || !toTime) return null;
  const from = new Date(`${fromDate}T${fromTime}:00`);
  const to = new Date(`${toDate}T${toTime}:00`);
  const diffMinutes = Math.round((to.getTime() - from.getTime()) / 60000);
  return Number.isNaN(diffMinutes) ? null : diffMinutes;
}

/** One "{duration} {airport}" entry per layover, e.g. "3 hr 20 min BOM". */
function layoverSummary(legs: FlightLeg[]): string | null {
  if (legs.length < 2) return null;
  return legs
    .slice(0, -1)
    .map((leg, i) => {
      const next = legs[i + 1];
      const minutes = minutesBetween(leg.arrivalDate, leg.arrivalTime, next.departureDate, next.departureTime);
      return `${formatDuration(minutes) ?? "—"} ${leg.arrivalAirport}`;
    })
    .join(", ");
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", INR: "₹", GBP: "£", EUR: "€" };

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${Math.round(price).toLocaleString()}`;
}

function formatEmissions(grams: number | null): string | null {
  if (grams == null) return null;
  return `${Math.round(grams / 1000)} kg CO2e`;
}

function emissionsDifferenceLabel(percent: number | null): string | null {
  if (percent == null) return null;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${Math.round(percent)}% emissions`;
}

function LegTimeline({ leg }: { leg: FlightLeg }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />

      <div className="relative flex items-center gap-2">
        <span className="absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-muted-foreground bg-card" />
        <span className="text-sm font-medium text-card-foreground">
          {leg.departureTime ?? "—"} · {leg.departureAirportName ?? leg.departureAirport} ({leg.departureAirport})
        </span>
      </div>

      <div className="py-2 text-xs text-muted-foreground">
        Travel time: {formatDuration(leg.durationMinutes) ?? "—"}
      </div>

      <div className="relative flex items-center gap-2">
        <span className="absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-muted-foreground bg-card" />
        <span className="text-sm font-medium text-card-foreground">
          {leg.arrivalTime ?? "—"} · {leg.arrivalAirportName ?? leg.arrivalAirport} ({leg.arrivalAirport})
          {leg.overnight && <sup className="ml-0.5 text-xs text-muted-foreground">+1</sup>}
        </span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {[leg.airline, leg.travelClass, leg.flightNumber].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

function LayoverRow({ prev, next }: { prev: FlightLeg; next: FlightLeg }) {
  const minutes = minutesBetween(prev.arrivalDate, prev.arrivalTime, next.departureDate, next.departureTime);
  return (
    <div className="my-3 border-y border-dashed border-border py-2 pl-6 text-xs text-muted-foreground">
      {formatDuration(minutes) ?? "Layover"} layover · {prev.arrivalAirportName ?? prev.arrivalAirport} ({prev.arrivalAirport})
    </div>
  );
}

function cabinMismatchLabel(legs: FlightLeg[], cabinClass: CabinClass): string | null {
  const mismatched = legs.find((leg) => leg.travelClass && leg.travelClass.toLowerCase() !== cabinClass.toLowerCase());
  if (!mismatched?.travelClass) return null;
  return /class/i.test(mismatched.travelClass) ? mismatched.travelClass : `${mismatched.travelClass} Class`;
}

function ItineraryCard({
  itinerary,
  cabinClass,
  onSelect,
  disabled,
}: {
  itinerary: FlightItinerary;
  cabinClass: CabinClass;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const firstLeg = itinerary.legs[0];
  const lastLeg = itinerary.legs[itinerary.legs.length - 1];
  const airlines = [...new Set(itinerary.legs.map((leg) => leg.airline))].join(", ");
  const layovers = layoverSummary(itinerary.legs);
  const mismatchLabel = cabinMismatchLabel(itinerary.legs, cabinClass);
  const emissions = formatEmissions(itinerary.carbonEmissionsGrams);
  const emissionsDiff = emissionsDifferenceLabel(itinerary.carbonEmissionsDifferencePercent);

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setExpanded((cur) => !cur)}
        className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-secondary/10 sm:flex-nowrap"
      >
        {firstLeg.airlineLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstLeg.airlineLogo} alt={firstLeg.airline} className="h-6 w-6 shrink-0 object-contain" />
        )}

        <div className="min-w-[9rem] flex-1">
          <div className="text-sm font-semibold text-card-foreground">
            {firstLeg.departureTime ?? "—"} – {lastLeg.arrivalTime ?? "—"}
            {lastLeg.overnight && <sup className="ml-0.5 text-xs text-muted-foreground">+1</sup>}
          </div>
          <div className="text-xs text-muted-foreground">{airlines}</div>
          {mismatchLabel && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-warning">
              <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {mismatchLabel}
            </div>
          )}
        </div>

        <div className="min-w-[7rem] flex-1">
          <div className="text-sm text-card-foreground">{formatDuration(itinerary.totalDurationMinutes) ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {firstLeg.departureAirport}–{lastLeg.arrivalAirport}
          </div>
        </div>

        <div className="min-w-[7rem] flex-1">
          <div className="text-sm text-card-foreground">{stopsLabel(itinerary.legs)}</div>
          {layovers && <div className="text-xs text-muted-foreground">{layovers}</div>}
        </div>

        <div className="min-w-[7rem] flex-1">
          {emissions && <div className="text-sm text-card-foreground">{emissions}</div>}
          {emissionsDiff && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {emissionsDiff}
              <IconInfo className="h-3 w-3 shrink-0" />
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-right">
          <div>
            {itinerary.price != null && (
              <div className="text-base font-semibold text-success">{formatPrice(itinerary.price, itinerary.currency)}</div>
            )}
            <div className="text-xs text-muted-foreground">{itinerary.type}</div>
          </div>
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          {itinerary.legs.map((leg, i) => (
            <div key={i}>
              <LegTimeline leg={leg} />
              {i < itinerary.legs.length - 1 && <LayoverRow prev={leg} next={itinerary.legs[i + 1]} />}
            </div>
          ))}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onSelect}
              disabled={disabled}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Select flight
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface FlightSearchInitial {
  tripType?: TripType;
  cabinClass?: CabinClass;
  from?: AirportSuggestion | null;
  to?: AirportSuggestion | null;
  departDate?: string;
  returnDate?: string;
  travelers?: number;
  autoSearch?: boolean;
}

interface MultiCitySearchLeg {
  id: number;
  from: AirportSuggestion | null;
  to: AirportSuggestion | null;
  date: string;
}

export function FlightSearchPanel({
  onFlightSelected,
  initial,
}: {
  onFlightSelected: (selection: FlightSelection) => void;
  initial?: FlightSearchInitial;
}) {
  const [tripType, setTripType] = useState<TripType>(initial?.tripType ?? "Round Trip");
  const [cabinClass, setCabinClass] = useState<CabinClass>(initial?.cabinClass ?? "Economy");
  const [from, setFrom] = useState<AirportSuggestion | null>(initial?.from ?? null);
  const [to, setTo] = useState<AirportSuggestion | null>(initial?.to ?? null);
  const [departDate, setDepartDate] = useState(initial?.departDate ?? "");
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? "");
  const [travelers, setTravelers] = useState(initial?.travelers ?? 1);
  const nextMultiCityId = useRef(2);
  const [multiCityLegs, setMultiCityLegs] = useState<MultiCitySearchLeg[]>([
    { id: 0, from: initial?.from ?? null, to: initial?.to ?? null, date: initial?.departDate ?? "" },
    { id: 1, from: initial?.to ?? null, to: null, date: "" },
  ]);
  const [filters, setFilters] = useState<FlightFilterState>(DEFAULT_FILTERS);

  const [phase, setPhase] = useState<"form" | "outbound" | "return" | "multicity">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outboundResult, setOutboundResult] = useState<FlightSearchResult | null>(null);
  const [selectedOutbound, setSelectedOutbound] = useState<FlightItinerary | null>(null);
  const [returnResult, setReturnResult] = useState<FlightSearchResult | null>(null);
  const [showOtherFlights, setShowOtherFlights] = useState(true);
  const [multiCityStep, setMultiCityStep] = useState(0);
  const [selectedMultiCityLegs, setSelectedMultiCityLegs] = useState<FlightLeg[]>([]);

  function resetToForm() {
    setPhase("form");
    setOutboundResult(null);
    setSelectedOutbound(null);
    setReturnResult(null);
    setError(null);
    setFilters(DEFAULT_FILTERS);
    setShowOtherFlights(false);
    setMultiCityStep(0);
    setSelectedMultiCityLegs([]);
  }

  function clearSearch() {
    setTripType("Round Trip");
    setCabinClass("Economy");
    setFrom(null);
    setTo(null);
    setDepartDate("");
    setReturnDate("");
    setTravelers(1);
    setMultiCityLegs([
      { id: 0, from: null, to: null, date: "" },
      { id: 1, from: null, to: null, date: "" },
    ]);
    resetToForm();
  }

  async function runSearch(departureToken?: string, filterState: FlightFilterState = filters) {
    if (loading) return null;
    const completeMultiCity = multiCityLegs.every((leg) => leg.from && leg.to && leg.date);
    if (tripType !== "Multi City" && (!from || !to)) {
      setError("Select both a departure and arrival airport.");
      return null;
    }
    if (tripType === "Multi City" && (multiCityLegs.length < 2 || !completeMultiCity)) {
      setError("Complete at least two multicity flights.");
      return null;
    }
    if (tripType !== "Multi City" && (!departDate || (tripType === "Round Trip" && !returnDate))) {
      setError("Select the travel date(s).");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        departureId: tripType === "Multi City" ? multiCityLegs[0].from!.code : from!.code,
        arrivalId: tripType === "Multi City" ? multiCityLegs[multiCityLegs.length - 1].to!.code : to!.code,
        outboundDate: tripType === "Multi City" ? multiCityLegs[0].date : departDate,
        tripType,
        cabinClass,
        adults: String(travelers),
      });
      if (tripType === "Round Trip") params.set("returnDate", returnDate);
      if (tripType === "Multi City") params.set("multiCityLegs", JSON.stringify(multiCityLegs.map((leg) => ({ departureId: leg.from!.code, arrivalId: leg.to!.code, date: leg.date }))));
      if (departureToken) params.set("departureToken", departureToken);

      if (filterState.stops !== "any") params.set("stops", filterState.stops);
      if (filterState.airlines.length) params.set("includeAirlines", filterState.airlines.join(","));
      if (filterState.bags > 0) params.set("bags", String(filterState.bags));
      if (filterState.maxPrice) params.set("maxPrice", filterState.maxPrice);
      if (filterState.depTimeMin > 0 || filterState.depTimeMax < 24) {
        params.set("times", `${filterState.depTimeMin},${filterState.depTimeMax}`);
      }
      if (filterState.emissions) params.set("emissions", "1");
      if (filterState.excludeConns.length) params.set("excludeConns", filterState.excludeConns.join(","));
      if (filterState.maxDurationHours) params.set("maxDuration", String(Number(filterState.maxDurationHours) * 60));

      const res = await fetch(`/api/flights/search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Flight search failed");
      return json as FlightSearchResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flight search failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    const result = await runSearch();
    if (!result) return;
    setOutboundResult(result);
    setPhase(tripType === "Multi City" ? "multicity" : "outbound");
    setShowOtherFlights(false);
  }

  const autoSearchRan = useRef(false);
  useEffect(() => {
    if (autoSearchRan.current) return;
    autoSearchRan.current = true;
    if (!initial?.autoSearch) return;
    // Deferred so the effect body itself never calls setState synchronously; not cancelled on
    // cleanup because React's dev-mode double-invoke would otherwise cancel the only real run.
    setTimeout(() => handleSearch(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiltersChange(next: FlightFilterState) {
    setFilters(next);
    if (phase === "outbound" || phase === "multicity") {
      const result = await runSearch(undefined, next);
      if (result) setOutboundResult(result);
    } else if (phase === "return" && selectedOutbound?.departureToken) {
      const result = await runSearch(selectedOutbound.departureToken, next);
      if (result) setReturnResult(result);
    }
  }

  function finalize(legs: FlightLeg[], currency: string) {
    const origin = tripType === "Multi City" ? multiCityLegs[0].from : from;
    const destination = tripType === "Multi City" ? multiCityLegs[multiCityLegs.length - 1].to : to;
    if (!origin || !destination) return;
    onFlightSelected({
      tripType,
      cabinClass,
      origin: origin.code,
      destination: destination.code,
      originCountry: origin.country,
      destinationCountry: destination.country,
      currency,
      legs,
    });
  }

  async function handleSelectMultiCity(itinerary: FlightItinerary) {
    const accumulated = [...selectedMultiCityLegs, ...itinerary.legs];
    if (multiCityStep >= multiCityLegs.length - 1) {
      finalize(accumulated, itinerary.currency);
      return;
    }
    if (!itinerary.departureToken) {
      setError("This itinerary cannot continue to the next multicity flight — try another option.");
      return;
    }
    const result = await runSearch(itinerary.departureToken);
    if (!result) return;
    setSelectedMultiCityLegs(accumulated);
    setMultiCityStep((step) => step + 1);
    setOutboundResult(result);
    setShowOtherFlights(false);
  }

  async function handleSelectOutbound(itinerary: FlightItinerary) {
    if (tripType === "One Way") {
      finalize(itinerary.legs, itinerary.currency);
      return;
    }
    if (!itinerary.departureToken) {
      setError("This itinerary doesn't support picking a return flight — try another one.");
      return;
    }
    const result = await runSearch(itinerary.departureToken);
    if (!result) return;
    setSelectedOutbound(itinerary);
    setReturnResult(result);
    setPhase("return");
    setShowOtherFlights(false);
  }

  function handleSelectReturn(itinerary: FlightItinerary) {
    if (!selectedOutbound) return;
    finalize([...selectedOutbound.legs, ...itinerary.legs], itinerary.currency || selectedOutbound.currency);
  }

  const outboundAirlines = useMemo(() => airlineOptions(outboundResult), [outboundResult]);
  const outboundConns = useMemo(() => connectingAirportOptions(outboundResult), [outboundResult]);
  const returnAirlines = useMemo(() => airlineOptions(returnResult), [returnResult]);
  const returnConns = useMemo(() => connectingAirportOptions(returnResult), [returnResult]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              checked={tripType === "Round Trip"}
              onChange={() => setTripType("Round Trip")}
              className="accent-primary"
            />
            Round Trip
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              checked={tripType === "One Way"}
              onChange={() => setTripType("One Way")}
              className="accent-primary"
            />
            One Way
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="radio" checked={tripType === "Multi City"} onChange={() => setTripType("Multi City")} className="accent-primary" />
            Multi City
          </label>
          <select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value as CabinClass)}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {CABIN_CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {tripType === "Multi City" ? (
          <div className="space-y-3">
            {multiCityLegs.map((leg, index) => (
              <div key={leg.id} className="grid grid-cols-1 items-end gap-4 rounded-xl border border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px_auto]">
                <AirportAutocomplete label={`Flight ${index + 1} from`} placeholder="City or airport" value={leg.from} onChange={(value) => setMultiCityLegs((rows) => rows.map((row) => row.id === leg.id ? { ...row, from: value } : row))} required />
                <AirportAutocomplete label="To" placeholder="City or airport" value={leg.to} onChange={(value) => setMultiCityLegs((rows) => rows.map((row, rowIndex) => row.id === leg.id ? { ...row, to: value } : rowIndex === index + 1 && !row.from ? { ...row, from: value } : row))} required />
                <div><label className={labelClass}>Depart</label><input type="date" value={leg.date} min={index > 0 ? multiCityLegs[index - 1].date || undefined : undefined} onChange={(e) => setMultiCityLegs((rows) => rows.map((row) => row.id === leg.id ? { ...row, date: e.target.value } : row))} className={inputClass} /></div>
                <button type="button" disabled={multiCityLegs.length <= 2} onClick={() => setMultiCityLegs((rows) => rows.filter((row) => row.id !== leg.id))} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-danger disabled:opacity-40">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setMultiCityLegs((rows) => [...rows, { id: nextMultiCityId.current++, from: rows[rows.length - 1].to, to: null, date: "" }])} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">+ Add flight</button>
          </div>
        ) : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <AirportAutocomplete label="From" placeholder="City or airport" value={from} onChange={setFrom} required />
          <AirportAutocomplete label="To" placeholder="City or airport" value={to} onChange={setTo} required />
          <div>
            <label className={labelClass}>Depart</label>
            <input
              type="date"
              value={departDate}
              onChange={(e) => {
                const next = e.target.value;
                setDepartDate(next);
                if (returnDate && next && returnDate <= next) setReturnDate("");
              }}
              className={inputClass}
            />
          </div>
          {tripType === "Round Trip" && (
            <div>
              <label className={labelClass}>Return</label>
              <input
                type="date"
                value={returnDate}
                min={departDate || undefined}
                onChange={(e) => setReturnDate(e.target.value)}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Travelers</label>
            <input
              type="number"
              min={1}
              max={9}
              value={travelers}
              onChange={(e) => setTravelers(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
              className={inputClass}
            />
          </div>
        </div>}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={clearSearch}
            disabled={loading}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search Flights"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {phase !== "form" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-card-foreground">
              {phase === "outbound" ? "Select outbound flight" : phase === "return" ? "Select inbound flight" : `Select flight ${multiCityStep + 1} of ${multiCityLegs.length}`}
            </h3>
            <button type="button" onClick={resetToForm} className="text-xs font-medium text-secondary-foreground hover:underline">
              Change search
            </button>
          </div>

          <FlightFilterBar
            filters={filters}
            onChange={handleFiltersChange}
            airlines={phase === "outbound" || phase === "multicity" ? outboundAirlines : returnAirlines}
            connectingAirports={phase === "outbound" || phase === "multicity" ? outboundConns : returnConns}
            loading={loading}
          />

          {loading && <p className="text-sm text-muted-foreground">Searching…</p>}

          {!loading &&
            phase === "outbound" &&
            outboundResult &&
            outboundResult.bestFlights.map((itin, i) => (
              <ItineraryCard
                key={i}
                itinerary={itin}
                cabinClass={cabinClass}
                onSelect={() => handleSelectOutbound(itin)}
                disabled={loading}
              />
            ))}

          {!loading &&
            phase === "return" &&
            returnResult &&
            returnResult.bestFlights.map((itin, i) => (
              <ItineraryCard
                key={i}
                itinerary={itin}
                cabinClass={cabinClass}
                onSelect={() => handleSelectReturn(itin)}
                disabled={loading}
              />
            ))}

          {!loading &&
            phase === "multicity" &&
            outboundResult &&
            outboundResult.bestFlights.map((itin, i) => (
              <ItineraryCard key={i} itinerary={itin} cabinClass={cabinClass} onSelect={() => handleSelectMultiCity(itin)} disabled={loading} />
            ))}

          {!loading &&
            (() => {
              const result = phase === "outbound" || phase === "multicity" ? outboundResult : phase === "return" ? returnResult : null;
              if (!result || result.otherFlights.length === 0) return null;
              return (
                <button
                  type="button"
                  onClick={() => setShowOtherFlights((cur) => !cur)}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <IconChevronDown className={`h-4 w-4 transition-transform ${showOtherFlights ? "rotate-180" : ""}`} />
                  {showOtherFlights ? "Show fewer flights" : "View more flights"}
                </button>
              );
            })()}

          {!loading &&
            showOtherFlights &&
            phase === "outbound" &&
            outboundResult &&
            outboundResult.otherFlights.map((itin, i) => (
              <ItineraryCard
                key={i}
                itinerary={itin}
                cabinClass={cabinClass}
                onSelect={() => handleSelectOutbound(itin)}
                disabled={loading}
              />
            ))}

          {!loading &&
            showOtherFlights &&
            phase === "return" &&
            returnResult &&
            returnResult.otherFlights.map((itin, i) => (
              <ItineraryCard
                key={i}
                itinerary={itin}
                cabinClass={cabinClass}
                onSelect={() => handleSelectReturn(itin)}
                disabled={loading}
              />
            ))}

          {!loading && showOtherFlights && phase === "multicity" && outboundResult && outboundResult.otherFlights.map((itin, i) => (
            <ItineraryCard key={i} itinerary={itin} cabinClass={cabinClass} onSelect={() => handleSelectMultiCity(itin)} disabled={loading} />
          ))}

          {!loading && phase === "outbound" && outboundResult && outboundResult.bestFlights.length === 0 && outboundResult.otherFlights.length === 0 && (
            <p className="text-sm text-muted-foreground">No Records found</p>
          )}
          {!loading && phase === "return" && returnResult && returnResult.bestFlights.length === 0 && returnResult.otherFlights.length === 0 && (
            <p className="text-sm text-muted-foreground">No Records found</p>
          )}
          {!loading && phase === "multicity" && outboundResult && outboundResult.bestFlights.length === 0 && outboundResult.otherFlights.length === 0 && (
            <p className="text-sm text-muted-foreground">No Records found</p>
          )}
        </div>
      )}
    </div>
  );
}

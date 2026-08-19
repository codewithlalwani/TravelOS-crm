"use client";

import { useEffect, useRef, useState } from "react";
import { FilterPill } from "@/components/FilterPill";
import { IconSliders, IconBuilding } from "@/components/icons";
import type { HotelProperty, HotelSearchResult } from "@/lib/hotels";
import type { LocationSuggestion } from "@/lib/geo";

export interface HotelSelection {
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  hotelRating: number | null;
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";

const GUEST_RATING_OPTIONS = [3.5, 4, 4.5] as const;

interface HotelFilterState {
  minPrice: string;
  maxPrice: string;
  hotelClass: number[];
  minRating: number | null;
}

const DEFAULT_FILTERS: HotelFilterState = {
  minPrice: "",
  maxPrice: "",
  hotelClass: [],
  minRating: null,
};

function isFiltersActive(f: HotelFilterState): boolean {
  return f.minPrice !== "" || f.maxPrice !== "" || f.hotelClass.length > 0 || f.minRating != null;
}

function activeCount(f: HotelFilterState): number {
  let n = 0;
  if (f.minPrice !== "" || f.maxPrice !== "") n++;
  if (f.hotelClass.length > 0) n++;
  if (f.minRating != null) n++;
  return n;
}

function HotelFilterBar({
  filters,
  onChange,
  loading,
}: {
  filters: HotelFilterState;
  onChange: (next: HotelFilterState) => void;
  loading: boolean;
}) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const toggle = (name: string) => setOpenFilter((cur) => (cur === name ? null : name));

  function toggleClass(cls: number) {
    const next = filters.hotelClass.includes(cls)
      ? filters.hotelClass.filter((c) => c !== cls)
      : [...filters.hotelClass, cls];
    onChange({ ...filters, hotelClass: next });
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

      <FilterPill
        label="Price"
        active={filters.minPrice !== "" || filters.maxPrice !== ""}
        open={openFilter === "price"}
        onToggle={() => toggle("price")}
      >
        <label className={labelClass}>Price per night (USD)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value })}
            className={inputClass}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
            className={inputClass}
          />
        </div>
      </FilterPill>

      <FilterPill
        label="Star rating"
        active={filters.hotelClass.length > 0}
        open={openFilter === "class"}
        onToggle={() => toggle("class")}
      >
        <div className="space-y-2">
          {[5, 4, 3, 2].map((cls) => (
            <label key={cls} className="flex items-center gap-2 text-sm text-card-foreground">
              <input
                type="checkbox"
                checked={filters.hotelClass.includes(cls)}
                onChange={() => toggleClass(cls)}
                className="accent-primary"
              />
              {cls}-star
            </label>
          ))}
        </div>
      </FilterPill>

      <FilterPill
        label="Guest rating"
        active={filters.minRating != null}
        open={openFilter === "rating"}
        onToggle={() => toggle("rating")}
        align="right"
      >
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-card-foreground">
            <input
              type="radio"
              checked={filters.minRating == null}
              onChange={() => onChange({ ...filters, minRating: null })}
              className="accent-primary"
            />
            Any rating
          </label>
          {GUEST_RATING_OPTIONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-card-foreground">
              <input
                type="radio"
                checked={filters.minRating === r}
                onChange={() => onChange({ ...filters, minRating: r })}
                className="accent-primary"
              />
              ★ {r}+
            </label>
          ))}
        </div>
      </FilterPill>
    </div>
  );
}

function PropertyCard({ property, onSelect }: { property: HotelProperty; onSelect: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4">
      {property.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={property.thumbnail} alt={property.name} className="h-20 w-28 flex-none rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-28 flex-none items-center justify-center rounded-lg bg-secondary/10">
          <IconBuilding className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-[200px] flex-1 space-y-1">
        <p className="font-medium text-card-foreground">{property.name}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {property.hotelClass && <span>{property.hotelClass}-star</span>}
          {property.overallRating != null && (
            <span>
              ★ {property.overallRating} {property.reviews != null && `(${property.reviews.toLocaleString()})`}
            </span>
          )}
        </div>
        {property.amenities.length > 0 && (
          <p className="text-xs text-muted-foreground">{property.amenities.slice(0, 4).join(" · ")}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {property.pricePerNight != null && (
          <span className="text-base font-semibold text-primary">${property.pricePerNight}/night</span>
        )}
        <button
          type="button"
          onClick={onSelect}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          Select
        </button>
      </div>
    </div>
  );
}

function DestinationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skips the next fetch right after a suggestion is clicked, so picking "Bali, Indonesia"
  // doesn't immediately reopen the dropdown with results for its own label.
  const lastPickedRef = useRef<string | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed === lastPickedRef.current) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/hotels/locations?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((json) => setSuggestions(json.suggestions ?? []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [value]);

  function pick(suggestion: LocationSuggestion) {
    lastPickedRef.current = suggestion.description;
    onChange(suggestion.description);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>Destination or Hotel</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="e.g. Bali Resorts"
        autoComplete="off"
        className={inputClass}
      />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
          {!loading &&
            suggestions.map((s, i) => (
              <button
                key={`${s.description}-${i}`}
                type="button"
                onClick={() => pick(s)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary/10"
              >
                <span className="font-medium text-card-foreground">{s.mainText}</span>
                {s.secondaryText && <span className="text-xs text-muted-foreground">{s.secondaryText}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export interface HotelSearchInitial {
  location?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  autoSearch?: boolean;
}

export function HotelSearchPanel({
  onHotelSelected,
  initial,
}: {
  onHotelSelected: (selection: HotelSelection) => void;
  initial?: HotelSearchInitial;
}) {
  const [location, setLocation] = useState(initial?.location ?? "");
  const [checkInDate, setCheckInDate] = useState(initial?.checkInDate ?? "");
  const [checkOutDate, setCheckOutDate] = useState(initial?.checkOutDate ?? "");
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [filters, setFilters] = useState<HotelFilterState>(DEFAULT_FILTERS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HotelSearchResult | null>(null);
  const [searched, setSearched] = useState(false);

  function clearSearch() {
    setLocation("");
    setCheckInDate("");
    setCheckOutDate("");
    setAdults(2);
    setChildren(0);
    setFilters(DEFAULT_FILTERS);
    setResult(null);
    setError(null);
    setSearched(false);
  }

  async function runSearch(filterState: HotelFilterState) {
    if (!location.trim()) {
      setError("Enter a destination or hotel name.");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setError("Select check-in and check-out dates.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: location.trim(),
        checkInDate,
        checkOutDate,
        adults: String(adults),
        children: String(children),
      });
      if (filterState.minPrice) params.set("minPrice", filterState.minPrice);
      if (filterState.maxPrice) params.set("maxPrice", filterState.maxPrice);
      if (filterState.hotelClass.length) params.set("hotelClass", filterState.hotelClass.join(","));
      if (filterState.minRating != null) params.set("minRating", String(filterState.minRating));

      const res = await fetch(`/api/hotels/search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Hotel search failed");
      setResult(json as HotelSearchResult);
    } catch (err) {
      console.error("Hotel search failed:", err);
      setResult({ properties: [] });
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  async function handleSearch() {
    await runSearch(filters);
  }

  async function handleFiltersChange(next: HotelFilterState) {
    setFilters(next);
    if (searched) await runSearch(next);
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

  function handleSelect(property: HotelProperty) {
    onHotelSelected({
      hotelName: property.name,
      address: location.trim(),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: adults + children,
      hotelRating: property.overallRating,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <DestinationField value={location} onChange={setLocation} />
          </div>
          <div>
            <label className={labelClass}>Check-in</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => {
                const value = e.target.value;
                setCheckInDate(value);
                if (checkOutDate && value && checkOutDate <= value) setCheckOutDate("");
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Check-out</label>
            <input
              type="date"
              min={checkInDate || undefined}
              disabled={!checkInDate}
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Adults</label>
              <input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Children</label>
              <input
                type="number"
                min={0}
                max={8}
                value={children}
                onChange={(e) => setChildren(Math.min(8, Math.max(0, Number(e.target.value) || 0)))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
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
            {loading ? "Searching…" : "Search Hotels"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>

      {searched && (
        <div className="space-y-3">
          <HotelFilterBar filters={filters} onChange={handleFiltersChange} loading={loading} />

          {loading && <p className="text-sm text-muted-foreground">Searching…</p>}

          {!loading &&
            result?.properties.map((property, i) => (
              <PropertyCard key={i} property={property} onSelect={() => handleSelect(property)} />
            ))}
          {!loading && result && result.properties.length === 0 && (
            <p className="text-sm text-muted-foreground">No hotels found for this search.</p>
          )}
        </div>
      )}
    </div>
  );
}

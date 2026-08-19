"use client";

import { useEffect, useRef, useState } from "react";

export interface RailStationSuggestion {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export function RailStationAutocomplete({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RailStationSuggestion | null;
  onChange: (station: RailStationSuggestion | null) => void;
}) {
  const [query, setQuery] = useState(value ? `${value.name} (${value.code})` : "");
  const [suggestions, setSuggestions] = useState<RailStationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A multicity selection can prefill the following journey's departure station.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value) setQuery(`${value.name} (${value.code})`);
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || (value && trimmed === `${value.name} (${value.code})`)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/rail/stations?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setSuggestions(response.ok ? data.suggestions ?? [] : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-card-foreground">
        {label} <span className="text-danger">*</span>
      </label>
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Type a station name"
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching stations…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No station found</div>
          )}
          {!loading && suggestions.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => {
                onChange(station);
                setQuery(`${station.name} (${station.code})`);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-secondary/10"
            >
              <span className="text-sm font-medium text-card-foreground">{station.name}</span>
              <span className="text-xs font-semibold text-muted-foreground">{station.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

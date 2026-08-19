"use client";

import { useEffect, useRef, useState } from "react";
import type { LocationSuggestion } from "@/lib/geo";

export function AccessLocationAutocomplete({
  defaultValue = "",
  defaultPlaceId = "",
  defaultRadiusKm = 25,
  fieldKey = "0",
}: {
  defaultValue?: string;
  defaultPlaceId?: string;
  defaultRadiusKm?: number;
  fieldKey?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPickedRef = useRef<string | null>(null);
  const [placeId, setPlaceId] = useState(defaultPlaceId);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === lastPickedRef.current) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/geo/access-locations?q=${encodeURIComponent(trimmed)}`)
        .then((response) => response.json())
        .then((json) => setSuggestions(json.suggestions ?? []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const pick = (suggestion: LocationSuggestion) => {
    lastPickedRef.current = suggestion.description;
    setQuery(suggestion.description);
    setPlaceId(suggestion.placeId ?? "");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={`accessLocation-${fieldKey}`} className="mb-1 block text-sm font-medium text-card-foreground">
        Access location
      </label>
      <input
        id={`accessLocation-${fieldKey}`}
        name="accessLocation"
        required
        value={query}
        onChange={(event) => {
          lastPickedRef.current = null;
          setPlaceId("");
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        placeholder="Start typing an office, city, or address"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input type="hidden" name="accessPlaceId" value={placeId} />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching Google Places…</div>}
          {!loading && suggestions.map((suggestion) => (
            <button key={suggestion.placeId ?? suggestion.description} type="button" onClick={() => pick(suggestion)} className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary/10">
              <span className="font-medium text-card-foreground">{suggestion.mainText}</span>
              {suggestion.secondaryText && <span className="text-xs text-muted-foreground">{suggestion.secondaryText}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Google Places suggestions identify the authorised CRM access location.</p>
      <label htmlFor={`accessRadiusKm-${fieldKey}`} className="mt-3 mb-1 block text-sm font-medium text-card-foreground">Allowed radius (km)</label>
      <input id={`accessRadiusKm-${fieldKey}`} name="accessRadiusKm" type="number" min="1" max="500" step="1" required defaultValue={defaultRadiusKm} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
  );
}

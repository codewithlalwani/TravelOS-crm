"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { LocationSuggestion } from "@/lib/geo";
import type { CountryAutocompleteHandle } from "@/components/CountryAutocomplete";

export function CityAutocomplete({
  name,
  label,
  required,
  placeholder,
  countryRef,
  stateRef,
  defaultValue,
  onValueChange,
  onStateChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Paired Country field to auto-fill from the picked city's Google Places details. */
  countryRef?: RefObject<CountryAutocompleteHandle | null>;
  /** Paired plain State input to auto-fill from the picked city's Google Places details. */
  stateRef?: RefObject<HTMLInputElement | null>;
  /** Pre-fill from an already-known city, e.g. when editing an existing record. */
  defaultValue?: string;
  /** Notified on every value change, so a parent can mirror the city into a summary or another field. */
  onValueChange?: (value: string) => void;
  /** Notified with the state/province Google Places resolved for the picked city, for a React-controlled State field. */
  onStateChange?: (state: string) => void;
}) {
  const [query, setQuery] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skips the next fetch right after a suggestion is clicked, so picking "Bali" doesn't
  // immediately reopen the dropdown with results for its own label.
  const lastPickedRef = useRef<string | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === lastPickedRef.current) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/geo/cities?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((json) => setSuggestions(json.suggestions ?? []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  function pick(suggestion: LocationSuggestion) {
    lastPickedRef.current = suggestion.mainText;
    setQuery(suggestion.mainText);
    onValueChange?.(suggestion.mainText);
    setSuggestions([]);
    setOpen(false);

    if (suggestion.placeId && (countryRef || stateRef || onStateChange)) {
      fetch(`/api/geo/cities/details?placeId=${encodeURIComponent(suggestion.placeId)}`)
        .then((res) => res.json())
        .then((json) => {
          const country = json.country as { code: string; name: string } | null;
          const state = json.state as string | null;
          if (country && countryRef) countryRef.current?.setValue(country.code, country.name);
          if (state && stateRef?.current) stateRef.current.value = state;
          if (state) onStateChange?.(state);
        })
        .catch(() => {});
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-card-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        name={name}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onValueChange?.(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

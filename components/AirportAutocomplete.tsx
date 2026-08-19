"use client";

import { useEffect, useRef, useState } from "react";
import type { AirportSuggestion } from "@/lib/flights";

function locationText(opt: AirportSuggestion): string {
  const place = [opt.city, opt.country].filter((v): v is string => Boolean(v)).join(", ");
  return place ? `${place} (${opt.code})` : opt.code;
}

function displayLabel(opt: AirportSuggestion): string {
  return locationText(opt);
}

export function AirportAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder?: string;
  value: AirportSuggestion | null;
  onChange: (value: AirportSuggestion | null) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState(value ? displayLabel(value) : "");
  const [syncedValue, setSyncedValue] = useState(value);
  const [rawOptions, setRawOptions] = useState<AirportSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust query text during render when `value` changes externally, instead of an effect.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setQuery(value ? displayLabel(value) : "");
  }

  const isStale = query.trim().length < 2 || (value != null && query.trim() === displayLabel(value));
  const options = isStale ? [] : rawOptions;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || (value != null && trimmed === displayLabel(value))) return;

    const controller = new AbortController();
    const handle = setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/flights/airports?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Airport search failed");
          return json;
        })
        .then((json) => setRawOptions(json.suggestions ?? []))
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") return;
          setRawOptions([]);
          setError(requestError instanceof Error ? requestError.message : "Airport search failed");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-card-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setError("");
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
          {!loading && error && <div className="px-3 py-2 text-xs text-danger">{error}</div>}
          {!loading && !error && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No airports found.</div>
          )}
          {!loading &&
            options.map((opt) => (
              <button
                key={`${opt.code}-${opt.name}`}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setQuery(displayLabel(opt));
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary/10"
              >
                <span className="font-semibold text-card-foreground">{opt.name}</span>
                <span className="text-xs text-muted-foreground">{locationText(opt)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

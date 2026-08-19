"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface CountrySuggestion {
  code: string;
  name: string;
}

export interface CountryAutocompleteHandle {
  /** Programmatically set the country, e.g. from a paired City field's Google Places result. */
  setValue: (code: string, name: string) => void;
}

export const CountryAutocomplete = forwardRef<
  CountryAutocompleteHandle,
  {
    name: string;
    label: string;
    required?: boolean;
    /** Pre-fill from an already-known country, e.g. when editing an existing record. */
    defaultValue?: { code: string; name: string };
    /** Notified whenever the resolved country changes, so a parent can mirror it into a summary. */
    onValueChange?: (code: string, name: string) => void;
  }
>(function CountryAutocomplete({ name, label, required, defaultValue, onValueChange }, ref) {
  const [query, setQuery] = useState(defaultValue?.name ?? "");
  const [code, setCode] = useState(defaultValue?.code ?? "");
  const [options, setOptions] = useState<CountrySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setValue: (nextCode: string, nextName: string) => {
      setCode(nextCode);
      setQuery(nextName);
      onValueChange?.(nextCode, nextName);
      setOptions([]);
      setOpen(false);
    },
  }));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || code) return;

    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/country-codes?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((json) => setOptions(json.suggestions ?? []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, code]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !code ? "Select a country from the suggestions" : "");
  }, [code, required]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-card-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input type="hidden" name={name} value={code} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCode("");
          onValueChange?.("", "");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. United States"
        autoComplete="off"
        required={required}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {open && (loading || options.length > 0) && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
          {!loading &&
            options.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setCode(opt.code);
                  setQuery(opt.name);
                  onValueChange?.(opt.code, opt.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary/10"
              >
                <span className="text-card-foreground">{opt.name}</span>
                <span className="text-xs font-medium text-muted-foreground">{opt.code}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
});

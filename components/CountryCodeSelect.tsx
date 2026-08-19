"use client";

import { useEffect, useRef, useState } from "react";

interface CountryCodeSuggestion {
  name: string;
  dial_code: string;
  code: string;
}

export function CountryCodeSelect({
  name,
  defaultValue = "+91",
}: {
  name: string;
  defaultValue?: string;
}) {
  const [dialCode, setDialCode] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CountryCodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      setLoading(true);
      fetch(`/api/country-codes?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((json) => setOptions(json.suggestions ?? []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  return (
    <div ref={containerRef} className="relative w-24 flex-none">
      <input type="hidden" name={name} value={dialCode} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {dialCode}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country or code"
            autoComplete="off"
            className="w-full border-b border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none"
          />
          <div className="max-h-56 overflow-auto">
            {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
            {!loading &&
              options.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setDialCode(opt.dial_code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary/10"
                >
                  <span className="text-card-foreground">{opt.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">{opt.dial_code}</span>
                </button>
              ))}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { AccessLocationAutocomplete } from "./AccessLocationAutocomplete";

interface InitialLocation {
  id: number;
  label: string;
  placeId: string;
  radiusKm: number;
}

export function AccessLocationsField({ initialLocations = [] }: { initialLocations?: InitialLocation[] }) {
  const [locations, setLocations] = useState(() =>
    initialLocations.map((location) => ({ key: `saved-${location.id}`, ...location }))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Allowed login locations</h2>
          <p className="text-xs text-muted-foreground">Optional. If configured, the user may log in from any listed geofence.</p>
        </div>
        <button type="button" onClick={() => setLocations((items) => [...items, { key: `new-${Date.now()}`, id: 0, label: "", placeId: "", radiusKm: 25 }])} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">
          + Add location
        </button>
      </div>
      {locations.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
          No login location restriction configured.
        </p>
      )}
      {locations.map((location, index) => (
        <div key={location.key} className="rounded-xl border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location {index + 1}</span>
            <button type="button" onClick={() => setLocations((items) => items.filter((item) => item.key !== location.key))} className="text-xs font-medium text-danger hover:underline">Remove</button>
          </div>
          <AccessLocationAutocomplete defaultValue={location.label} defaultPlaceId={location.placeId} defaultRadiusKm={location.radiusKm} fieldKey={location.key} />
        </div>
      ))}
    </div>
  );
}

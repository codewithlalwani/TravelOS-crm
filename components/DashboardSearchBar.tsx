"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AirportAutocomplete } from "@/components/AirportAutocomplete";
import { IconBuilding, IconPlane, IconSearch } from "@/components/icons";
import type { AirportSuggestion } from "@/lib/flights";
import type { CabinClass, TripType } from "@/lib/booking/flightOptions";

type Tab = "stays" | "flights";

const inputClass =
  "w-full rounded-xl border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground shadow-inner shadow-black/5 transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";

function TabButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 border-b-2 px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : disabled
          ? "cursor-not-allowed border-transparent text-muted-foreground/50"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {disabled && <span className="text-[10px] font-normal text-muted-foreground/70">No access</span>}
    </button>
  );
}

export function DashboardSearchBar({ canFlights, canHotels }: { canFlights: boolean; canHotels: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(canHotels ? "stays" : "flights");
  const [error, setError] = useState<string | null>(null);

  // Stays
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [staysTravelers, setStaysTravelers] = useState(2);

  // Flights
  const [tripType, setTripType] = useState<TripType>("Round Trip");
  const [cabinClass, setCabinClass] = useState<CabinClass>("Economy");
  const [from, setFrom] = useState<AirportSuggestion | null>(null);
  const [to, setTo] = useState<AirportSuggestion | null>(null);
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [flightTravelers, setFlightTravelers] = useState(1);

  function searchStays() {
    if (!location.trim()) {
      setError("Enter a destination or hotel name.");
      return;
    }
    if (!checkIn || !checkOut) {
      setError("Select check-in and check-out dates.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      location: location.trim(),
      checkIn,
      checkOut,
      adults: String(staysTravelers),
      children: "0",
      autoSearch: "1",
    });
    router.push(`/bookings/new/hotel?${params.toString()}`);
  }

  function searchFlights() {
    if (!from || !to) {
      setError("Select both a departure and arrival airport.");
      return;
    }
    if (!departDate || (tripType === "Round Trip" && !returnDate)) {
      setError("Select the travel date(s).");
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      originCode: from.code,
      originName: from.name,
      originCity: from.city || "",
      originCountry: from.country || "",
      destCode: to.code,
      destName: to.name,
      destCity: to.city || "",
      destCountry: to.country || "",
      tripType,
      cabinClass,
      departDate,
      returnDate: tripType === "Round Trip" ? returnDate : "",
      travelers: String(flightTravelers),
      autoSearch: "1",
    });
    router.push(`/bookings/new?${params.toString()}`);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_55px_rgba(0,0,0,0.14)]">
      <div className="mb-5 flex flex-wrap gap-2 border-b border-border">
        <TabButton
          icon={<IconBuilding className="h-5 w-5" />}
          label="Stays"
          active={tab === "stays"}
          disabled={!canHotels}
          onClick={() => canHotels && setTab("stays")}
        />
        <TabButton
          icon={<IconPlane className="h-5 w-5" />}
          label="Flights"
          active={tab === "flights"}
          disabled={!canFlights}
          onClick={() => canFlights && setTab("flights")}
        />
      </div>

      {tab === "stays" && canHotels && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Where to?</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Destination or hotel name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Check-out</label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Travellers</label>
              <input
                type="number"
                min={1}
                max={9}
                value={staysTravelers}
                onChange={(e) => setStaysTravelers(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={searchStays}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(110deg,#3478f6,#7048ed)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,92,240,0.28)] transition hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      )}

      {tab === "flights" && canFlights && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
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
            <select
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value as CabinClass)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First">First</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <AirportAutocomplete label="From" placeholder="City or airport" value={from} onChange={setFrom} required />
            <AirportAutocomplete label="To" placeholder="City or airport" value={to} onChange={setTo} required />
            <div>
              <label className={labelClass}>Depart</label>
              <input
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            {tripType === "Round Trip" && (
              <div>
                <label className={labelClass}>Return</label>
                <input
                  type="date"
                  value={returnDate}
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
                value={flightTravelers}
                onChange={(e) => setFlightTravelers(Math.min(9, Math.max(1, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={searchFlights}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(110deg,#3478f6,#7048ed)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(79,92,240,0.28)] transition hover:brightness-110"
            >
              <IconSearch className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      )}

      {!canHotels && !canFlights && (
        <p className="text-sm text-muted-foreground">You don&apos;t have access to search any products yet.</p>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

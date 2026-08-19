"use client";

import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import type { TripType } from "@/lib/booking/flightOptions";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconPlus, IconTrain } from "@/components/icons";
import { RailStationAutocomplete, type RailStationSuggestion } from "@/components/RailStationAutocomplete";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";

const railOperators = [
  { name: "VIA Rail", logo: "/via-rail-logo.jpg", width: 299, height: 237 },
  { name: "Amtrak", logo: "/amtrak-logo.png", width: 1557, height: 166 },
] as const;

interface RailLeg {
  id: number;
  from: RailStationSuggestion | null;
  to: RailStationSuggestion | null;
  date: string;
}

function OperatorLogo({ operator, compact = false }: { operator: string; compact?: boolean }) {
  const selectedOperator = railOperators.find((item) => item.name === operator) ?? railOperators[0];

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white ${compact ? "h-6 w-16" : "h-9 w-24"}`}>
      <Image
        src={selectedOperator.logo}
        alt={`${selectedOperator.name} logo`}
        width={selectedOperator.width}
        height={selectedOperator.height}
        className={selectedOperator.name === "VIA Rail" ? "w-full scale-[2.2] object-contain" : "w-full object-contain px-1"}
      />
    </span>
  );
}

export function RailBookingPanel({ action }: { action: (formData: FormData) => void }) {
  const [from, setFrom] = useState<RailStationSuggestion | null>(null);
  const [to, setTo] = useState<RailStationSuggestion | null>(null);
  const [tripType, setTripType] = useState<TripType>("Round Trip");
  const [step, setStep] = useState(0);
  const [operator, setOperator] = useState("VIA Rail");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const nextLegId = useRef(2);
  const [multiCityLegs, setMultiCityLegs] = useState<RailLeg[]>([
    { id: 0, from: null, to: null, date: "" },
    { id: 1, from: null, to: null, date: "" },
  ]);
  const [travelers, setTravelers] = useState(1);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const railLegs = tripType === "Multi City"
    ? multiCityLegs.map((leg) => ({
        originCode: leg.from?.code ?? "",
        originName: leg.from?.name ?? "",
        destinationCode: leg.to?.code ?? "",
        destinationName: leg.to?.name ?? "",
        departureDate: leg.date,
      }))
    : [
        {
          originCode: from?.code ?? "",
          originName: from?.name ?? "",
          destinationCode: to?.code ?? "",
          destinationName: to?.name ?? "",
          departureDate,
        },
        ...(tripType === "Round Trip" ? [{
          originCode: to?.code ?? "",
          originName: to?.name ?? "",
          destinationCode: from?.code ?? "",
          destinationName: from?.name ?? "",
          departureDate: returnDate,
        }] : []),
      ];

  function continueToBookingDetails() {
    const incompleteLeg = railLegs.find((leg) => !leg.originCode || !leg.destinationCode || !leg.departureDate);
    if (incompleteLeg) {
      setJourneyError(`Complete all ${tripType.toLowerCase()} journey details.`);
      return;
    }
    if (railLegs.some((leg) => leg.originCode === leg.destinationCode)) {
      setJourneyError("Departure and arrival stations must be different for every journey.");
      return;
    }
    const travelersInput = formRef.current?.elements.namedItem("travelers") as HTMLInputElement | null;
    if (!travelersInput?.reportValidity()) return;
    setJourneyError(null);
    setStep(1);
  }

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary"><IconTrain className="h-6 w-6" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-card-foreground">
            {step === 0 ? "Rail journey" : "Booking information"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === 0 ? "Choose the journey and travelers." : "Add customer and fare information, then review the booking."}
          </p>
        </div>
      </div>

      <div className={step === 0 ? "flex flex-wrap items-center gap-4 rounded-xl border border-border bg-background p-4" : "hidden"}>
        {(["Round Trip", "One Way", "Multi City"] as TripType[]).map((type) => (
          <label key={type} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="radio"
              name="tripType"
              value={type}
              checked={tripType === type}
              onChange={() => {
                setTripType(type);
                setJourneyError(null);
              }}
              className="accent-primary"
            />
            {type}
          </label>
        ))}
      </div>

      <ol className="flex gap-2 text-sm">
        {["Journey", "Booking information"].map((label, index) => (
          <li key={label} className={`rounded-full px-3 py-1.5 font-medium ${step === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <section className={step === 0 ? "space-y-4" : "hidden"}>
        <div>
          <span className={labelClass}>Rail operator *</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {railOperators.map((item) => (
              <label
                key={item.name}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${operator === item.name ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="operator"
                  value={item.name}
                  checked={operator === item.name}
                  onChange={(event) => setOperator(event.target.value)}
                  className="sr-only"
                  required
                />
                <OperatorLogo operator={item.name} />
                <span className="text-sm font-semibold text-foreground">{item.name}</span>
              </label>
            ))}
          </div>
        </div>

        {tripType === "Multi City" ? (
          <div className="space-y-3">
            {multiCityLegs.map((leg, index) => (
              <div key={leg.id} className="grid items-end gap-4 rounded-xl border border-border bg-background/60 p-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_220px_auto]">
                <RailStationAutocomplete
                  label={`Journey ${index + 1} from`}
                  value={leg.from}
                  onChange={(station) => setMultiCityLegs((rows) => rows.map((row) => row.id === leg.id ? { ...row, from: station } : row))}
                />
                <RailStationAutocomplete
                  label="To"
                  value={leg.to}
                  onChange={(station) => setMultiCityLegs((rows) => rows.map((row, rowIndex) => row.id === leg.id
                    ? { ...row, to: station }
                    : rowIndex === index + 1 && !row.from ? { ...row, from: station } : row))}
                />
                <div>
                  <label className={labelClass}>Departure date *</label>
                  <input type="date" value={leg.date} min={index > 0 ? multiCityLegs[index - 1].date || undefined : undefined} onChange={(event) => setMultiCityLegs((rows) => rows.map((row) => row.id === leg.id ? { ...row, date: event.target.value } : row))} required className={inputClass} />
                </div>
                <button type="button" disabled={multiCityLegs.length <= 2} onClick={() => setMultiCityLegs((rows) => rows.filter((row) => row.id !== leg.id))} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-danger disabled:opacity-40">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => setMultiCityLegs((rows) => [...rows, { id: nextLegId.current++, from: rows[rows.length - 1].to, to: null, date: "" }])} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
              <IconPlus className="h-4 w-4" /> Add journey
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 md:grid-cols-2 ${tripType === "Round Trip" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            <RailStationAutocomplete label="Departure station" value={from} onChange={setFrom} />
            <RailStationAutocomplete label="Arrival station" value={to} onChange={setTo} />
            <div>
              <label className={labelClass}>Departure date *</label>
              <input type="date" value={departureDate} onChange={(event) => { setDepartureDate(event.target.value); if (returnDate && event.target.value && returnDate < event.target.value) setReturnDate(""); }} min={new Date().toISOString().slice(0, 10)} required className={inputClass} />
            </div>
            {tripType === "Round Trip" && (
              <div>
                <label className={labelClass}>Return date *</label>
                <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} min={departureDate || new Date().toISOString().slice(0, 10)} required className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Travelers *</label>
              <input name="travelers" type="number" min={1} max={9} value={travelers} onChange={(event) => setTravelers(Math.min(9, Math.max(1, Number(event.target.value) || 1)))} required className={inputClass} />
            </div>
          </div>
        )}
        {tripType === "Multi City" && (
          <div className="max-w-[220px]">
            <label className={labelClass}>Travelers *</label>
            <input name="travelers" type="number" min={1} max={9} value={travelers} onChange={(event) => setTravelers(Math.min(9, Math.max(1, Number(event.target.value) || 1)))} required className={inputClass} />
          </div>
        )}
      </section>

      {step === 0 && journeyError && <p className="text-sm text-danger">{journeyError}</p>}

      <input type="hidden" name="railLegs" value={JSON.stringify(railLegs)} />

      <section className={step === 1 ? "space-y-5" : "hidden"}>
        <div className="rounded-xl border border-border bg-background p-4">
          <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Journey summary</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Operator</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-foreground"><OperatorLogo operator={operator} compact /> {operator}</dd>
            </div>
            <div><dt className="text-muted-foreground">Trip type</dt><dd className="font-medium text-foreground">{tripType}</dd></div>
            <div><dt className="text-muted-foreground">Journey</dt><dd className="font-medium text-foreground">{railLegs.length} {railLegs.length === 1 ? "leg" : "legs"}</dd></div>
            <div><dt className="text-muted-foreground">Travelers</dt><dd className="font-medium text-foreground">{travelers}</dd></div>
          </dl>
        </div>

        <div className="border-t border-border pt-5">
        <h3 className="mb-4 font-heading text-sm font-semibold text-card-foreground">Customer and fare</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div><label className={labelClass}>Customer name *</label><input name="customerName" required className={inputClass} /></div>
          <div><label className={labelClass}>Email *</label><input name="customerEmail" type="email" required className={inputClass} /></div>
          <div><label className={labelClass}>Phone</label><input name="customerPhone" type="tel" className={inputClass} /></div>
          <div>
            <label className={labelClass}>Currency *</label>
            <select name="currency" defaultValue="CAD" className={inputClass} required>
              {BOOKING_CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
          <div><label className={labelClass}>Selling price *</label><input name="totalAmount" type="number" min="0.01" step="0.01" required className={inputClass} /></div>
          <div><label className={labelClass}>Net cost *</label><input name="netAmount" type="number" min="0" step="0.01" required className={inputClass} /></div>
        </div>
        </div>
      </section>

      {step === 0 ? (
        <div className="flex justify-end">
          <button type="button" onClick={continueToBookingDetails} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover">
            Continue
          </button>
        </div>
      ) : (
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setStep(0)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/10">
          Back
        </button>
        <ConfirmSubmitButton
          confirmTitle="Create rail booking?"
          confirmMessage="The booking will be created and opened at the authorization step. After authorization, use the Payment tab to create a payment link."
          confirmLabel="Create Booking"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          Create and Continue
        </ConfirmSubmitButton>
      </div>
      )}
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">Station data: VIA Rail GTFS under the Open Government Licence – Canada 2.0.</p>
    </form>
  );
}

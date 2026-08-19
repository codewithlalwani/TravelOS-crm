"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { PAX_TYPES, PAX_TYPE_LABEL, type PaxType } from "@/lib/booking/paxTypes";
import { CABIN_CLASS_OPTIONS, type CabinClass, type TripType } from "@/lib/booking/flightOptions";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import type { FlightLeg } from "@/lib/flights";
import { IconChevronDown, IconPlane, IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { FlightSearchPanel, type FlightSelection, type FlightSearchInitial } from "./FlightSearchPanel";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

const STEPS = ["Search Flights", "Customer", "Flight Details", "Passengers", "Fare & Review"] as const;

const GDS_OPTIONS = ["Supplier", "Amadeus", "Sabre", "Galileo/Travelport"];
const FARE_TYPE_OPTIONS = ["PUBLISHED", "NET", "IT", "SPECIAL"];
const SEGMENT_STATUS_OPTIONS = ["HK", "KK", "RQ", "UC"];
const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Mstr"];

interface PassengerRow {
  id: number;
  paxType: PaxType;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

export function NewBookingWizard({
  action,
  initialFlightSearch,
}: {
  action: (formData: FormData) => void;
  initialFlightSearch?: FlightSearchInitial;
}) {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);
  // Stable per-segment refs so a picked Dep/Arr City can auto-fill its paired Country field —
  // keyed lazily since segment ids are dynamic (added/removed by the user).
  const segmentCountryRefs = useRef<Record<string, RefObject<CountryAutocompleteHandle | null>>>({});
  function getSegmentCountryRef(key: string): RefObject<CountryAutocompleteHandle | null> {
    if (!segmentCountryRefs.current[key]) segmentCountryRefs.current[key] = { current: null };
    return segmentCountryRefs.current[key];
  }

  const nextSegmentId = useRef(1);
  const nextPassengerId = useRef(1);
  const [segmentIds, setSegmentIds] = useState<number[]>([0]);
  const [collapsedSegments, setCollapsedSegments] = useState<Set<number>>(new Set());
  const [passengers, setPassengers] = useState<PassengerRow[]>([{ id: 0, paxType: "ADT" }]);
  const [fareInputs, setFareInputs] = useState<Record<string, { gross: number; net: number }>>({});

  interface PendingPrefill {
    origin: string;
    destination: string;
    tripType: TripType;
    cabinClass: CabinClass;
    currency: string;
    ticketingSupplier: string;
    journeyType: "Domestic" | "International" | null;
    legs: Array<{ id: number; leg: FlightLeg }>;
  }
  const [pendingPrefill, setPendingPrefill] = useState<PendingPrefill | null>(null);
  const [segmentPrefillById, setSegmentPrefillById] = useState<Record<number, FlightLeg>>({});
  const [selectedFlight, setSelectedFlight] = useState<FlightSelection | null>(null);

  function handleFlightSelected(selection: FlightSelection) {
    const ids = selection.legs.map(() => nextSegmentId.current++);
    setSegmentIds(ids);
    setSegmentPrefillById(Object.fromEntries(ids.map((id, i) => [id, selection.legs[i]])));
    setSelectedFlight(selection);
    setPendingPrefill({
      origin: selection.origin,
      destination: selection.destination,
      tripType: selection.tripType,
      cabinClass: selection.cabinClass,
      currency: selection.currency,
      ticketingSupplier: selection.legs[0]?.airline || selection.legs[0]?.airlineCode || "",
      journeyType:
        selection.originCountry && selection.destinationCountry
          ? selection.originCountry === selection.destinationCountry
            ? "Domestic"
            : "International"
          : null,
      legs: ids.map((id, i) => ({ id, leg: selection.legs[i] })),
    });
    setStep(1);
  }

  useEffect(() => {
    if (!pendingPrefill) return;
    const form = formRef.current;
    if (!form) return;

    const setValue = (name: string, value: string) => {
      const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
      if (el) el.value = value;
    };

    setValue("origin", pendingPrefill.origin);
    setValue("destination", pendingPrefill.destination);
    setValue("tripType", pendingPrefill.tripType);
    setValue("cabinClass", pendingPrefill.cabinClass);
    setValue("ticketingSupplier", pendingPrefill.ticketingSupplier);
    setValue("buyCurrency", pendingPrefill.currency);
    setValue("sellCurrency", pendingPrefill.currency);
    if (pendingPrefill.journeyType) {
      const radio = form.querySelector<HTMLInputElement>(
        `input[name="journeyType"][value="${pendingPrefill.journeyType}"]`
      );
      if (radio) radio.checked = true;
    }

    for (const { id, leg } of pendingPrefill.legs) {
      setValue(`segment_flightNumber_${id}`, leg.flightNumber ?? "");
      setValue(`segment_airline_${id}`, leg.airline || leg.airlineCode || "");
      setValue(`segment_depAirport_${id}`, leg.departureAirport ?? "");
      setValue(`segment_depDate_${id}`, leg.departureDate ?? "");
      setValue(`segment_depTime_${id}`, leg.departureTime ?? "");
      setValue(`segment_arrAirport_${id}`, leg.arrivalAirport ?? "");
      setValue(`segment_arrDate_${id}`, leg.arrivalDate ?? "");
      setValue(`segment_arrTime_${id}`, leg.arrivalTime ?? "");
      setValue(`segment_cabinClass_${id}`, leg.travelClass ?? "");
    }

    setPendingPrefill(null);
  }, [pendingPrefill]);

  function goNext() {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (section) {
      const invalid = section.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function addSegment() {
    const id = nextSegmentId.current++;
    setSegmentIds((ids) => [...ids, id]);
  }

  function removeSegment(id: number) {
    setSegmentIds((ids) => (ids.length > 1 ? ids.filter((i) => i !== id) : ids));
  }

  function toggleSegment(id: number) {
    setCollapsedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addPassenger() {
    const id = nextPassengerId.current++;
    setPassengers((rows) => [...rows, { id, paxType: "ADT" }]);
  }

  function removePassenger(id: number) {
    setPassengers((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  function setPassengerType(id: number, paxType: PaxType) {
    setPassengers((rows) => rows.map((r) => (r.id === id ? { ...r, paxType } : r)));
  }

  function setFareValue(paxType: PaxType, field: "gross" | "net", value: number) {
    setFareInputs((prev) => ({
      ...prev,
      [paxType]: { gross: prev[paxType]?.gross ?? 0, net: prev[paxType]?.net ?? 0, [field]: value },
    }));
  }

  const paxTypesInUse = Array.from(new Set(passengers.map((p) => p.paxType)));
  const paxCountByType = passengers.reduce<Record<string, number>>((acc, p) => {
    acc[p.paxType] = (acc[p.paxType] || 0) + 1;
    return acc;
  }, {});
  const estimatedTotal = paxTypesInUse.reduce((sum, type) => {
    const fare = fareInputs[type];
    return sum + (fare?.gross ?? 0) * (paxCountByType[type] || 0);
  }, 0);
  const totalNet = paxTypesInUse.reduce((sum, type) => {
    const fare = fareInputs[type];
    return sum + (fare?.net ?? 0) * (paxCountByType[type] || 0);
  }, 0);
  const mcoAmount = estimatedTotal - totalNet;

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-6">
      <input type="hidden" name="segmentIds" value={segmentIds.join(",")} />
      <input type="hidden" name="passengerIds" value={passengers.map((p) => p.id).join(",")} />

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                i === step
                  ? "border-primary bg-primary/10 text-primary"
                  : i < step
                  ? "border-secondary/40 bg-secondary/10 text-secondary-foreground cursor-pointer"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Step 0: Search Flights */}
      <div data-step={0} hidden={step !== 0} className="space-y-6">
        <FlightSearchPanel onFlightSelected={handleFlightSelected} initial={initialFlightSearch} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm font-medium text-secondary-foreground hover:underline"
          >
            Skip and enter flight details manually →
          </button>
        </div>
      </div>

      {/* Step 1: Customer */}
      <div data-step={1} hidden={step !== 1} className="space-y-6">
        {selectedFlight && (
          <div className={sectionClass}>
            <h2 className="mb-3 font-heading text-base font-semibold text-card-foreground">Selected Flight</h2>
            <div className="space-y-2">
              {selectedFlight.legs.map((leg, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                  {leg.airlineLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={leg.airlineLogo} alt={leg.airline} className="h-6 w-6 shrink-0 object-contain" />
                  ) : (
                    <IconPlane className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}

                  <div className="min-w-[14rem] flex-1">
                    <div className="text-sm font-semibold text-card-foreground">
                      {leg.departureTime ?? "—"} · {leg.departureAirport} → {leg.arrivalTime ?? "—"} · {leg.arrivalAirport}
                      {leg.overnight && <sup className="ml-0.5 text-xs text-muted-foreground">+1</sup>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {leg.departureDate}
                      {leg.arrivalDate && leg.arrivalDate !== leg.departureDate ? ` – ${leg.arrivalDate}` : ""}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {[leg.airline, leg.flightNumber].filter(Boolean).join(" ")}
                  </div>

                  {leg.travelClass && (
                    <span className="ml-auto rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {leg.travelClass}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Customer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="First Name" required>
            <input name="customerFirstName" required className={inputClass} />
          </Field>
          <Field label="Middle Name">
            <input name="customerMiddleName" className={inputClass} />
          </Field>
          <Field label="Last Name" required>
            <input name="customerLastName" required className={inputClass} />
          </Field>
          <Field label="Email" required>
            <input name="customerEmail" type="email" required className={inputClass} />
          </Field>
          <Field label="Phone (optional)">
            <input name="customerPhone" className={inputClass} />
          </Field>
          <Field label="Address" required>
            <input name="customerAddressStreet1" required className={inputClass} />
          </Field>
          <CityAutocomplete
            name="customerAddressCity"
            label="City"
            required
            countryRef={customerCountryRef}
            stateRef={customerStateRef}
          />
          <Field label="State" required>
            <input ref={customerStateRef} name="customerAddressState" required className={inputClass} />
          </Field>
          <CountryAutocomplete ref={customerCountryRef} name="customerAddressCountry" label="Country" required />
        </div>
        </div>
      </div>

      {/* Step 2: Flight Details */}
      <div data-step={2} hidden={step !== 2} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Manage Flight Details</h2>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <Field label="Departure Airport" required>
              <input name="origin" required placeholder="e.g. JFK" className={inputClass} />
            </Field>
            <Field label="Arrival Airport" required>
              <input name="destination" required placeholder="e.g. LHR" className={inputClass} />
            </Field>
            <Field label="PNR Number" required>
              <input name="pnr" required className={inputClass} />
            </Field>
            <Field label="Trip Type" required>
              <select name="tripType" required defaultValue="One Way" className={inputClass}>
                <option value="One Way">One Way</option>
                <option value="Round Trip">Round Trip</option>
                <option value="Multi City">Multi City</option>
              </select>
            </Field>
            <Field label="Journey Type" required>
              <div className="flex items-center gap-4 pt-2.5">
                <label className="flex items-center gap-1.5 text-sm text-foreground">
                  <input
                    type="radio"
                    name="journeyType"
                    value="Domestic"
                    defaultChecked
                    className="accent-primary"
                  />
                  Domestic
                </label>
                <label className="flex items-center gap-1.5 text-sm text-foreground">
                  <input type="radio" name="journeyType" value="International" className="accent-primary" />
                  International
                </label>
              </div>
            </Field>
            <Field label="Cabin Class" required>
              <select name="cabinClass" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select
                </option>
                {CABIN_CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="GDS" required>
              <select name="gds" required defaultValue="Supplier" className={inputClass}>
                {GDS_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ticketing Supplier" required>
              <input name="ticketingSupplier" required placeholder="Select supplier" className={inputClass} />
            </Field>
            <Field label="Fare Type" required>
              <select name="fareType" required defaultValue="PUBLISHED" className={inputClass}>
                {FARE_TYPE_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ticketing Deadline">
              <input name="ticketingDeadline" type="date" className={inputClass} />
            </Field>
            <Field label="Time">
              <input name="ticketingDeadlineTime" type="time" defaultValue="23:59" className={inputClass} />
            </Field>
            <Field label="Supplier Reference">
              <input name="supplierReference" className={inputClass} />
            </Field>
            <Field label="Buy Currency" required>
              <select name="buyCurrency" required defaultValue="USD" className={inputClass}>
                {BOOKING_CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sell Currency" required>
              <select name="sellCurrency" required defaultValue="USD" className={inputClass}>
                {BOOKING_CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className={sectionClass}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-card-foreground">Segments</h2>
            <button
              type="button"
              onClick={addSegment}
              className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Add Segment
            </button>
          </div>
          <div className="space-y-5">
            {/* Stable per-row refs are created lazily for the dynamic segment fields. */}
            {/* eslint-disable-next-line react-hooks/refs */}
            {segmentIds.map((id, index) => (
              <div key={id} className="rounded-xl border border-border">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSegment(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSegment(id);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="flex items-center gap-2">
                    <IconChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        collapsedSegments.has(id) ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="text-sm font-semibold text-card-foreground">Segment {index + 1}</span>
                  </span>
                  {segmentIds.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSegment(id);
                      }}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div
                  hidden={collapsedSegments.has(id)}
                  className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border p-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8"
                >
                  <Field label="Flight No." required>
                    <input name={`segment_flightNumber_${id}`} required placeholder="e.g. AA123" className={inputClass} />
                  </Field>
                  <Field label="Airline" required>
                    <input name={`segment_airline_${id}`} required className={inputClass} />
                  </Field>
                  <Field label="Status" required>
                    <select name={`segment_status_${id}`} required defaultValue="HK" className={inputClass}>
                      {SEGMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dep Airport" required>
                    <input name={`segment_depAirport_${id}`} required className={inputClass} />
                  </Field>
                  <CityAutocomplete
                    name={`segment_depCity_${id}`}
                    label="Dep City"
                    required
                    countryRef={getSegmentCountryRef(`dep_${id}`)}
                    defaultValue={segmentPrefillById[id]?.departureCity ?? undefined}
                  />
                  <CountryAutocomplete
                    ref={getSegmentCountryRef(`dep_${id}`)}
                    name={`segment_depCountry_${id}`}
                    label="Dep Country"
                    required
                    defaultValue={
                      segmentPrefillById[id]?.departureCountryCode && segmentPrefillById[id]?.departureCountry
                        ? {
                            code: segmentPrefillById[id].departureCountryCode,
                            name: segmentPrefillById[id].departureCountry,
                          }
                        : undefined
                    }
                  />
                  <Field label="Dep Date" required>
                    <input name={`segment_depDate_${id}`} type="date" required className={inputClass} />
                  </Field>
                  <Field label="Dep Time" required>
                    <input name={`segment_depTime_${id}`} type="time" required className={inputClass} />
                  </Field>
                  <Field label="Arr Airport" required>
                    <input name={`segment_arrAirport_${id}`} required className={inputClass} />
                  </Field>
                  <CityAutocomplete
                    name={`segment_arrCity_${id}`}
                    label="Arr City"
                    required
                    countryRef={getSegmentCountryRef(`arr_${id}`)}
                    defaultValue={segmentPrefillById[id]?.arrivalCity ?? undefined}
                  />
                  <CountryAutocomplete
                    ref={getSegmentCountryRef(`arr_${id}`)}
                    name={`segment_arrCountry_${id}`}
                    label="Arr Country"
                    required
                    defaultValue={
                      segmentPrefillById[id]?.arrivalCountryCode && segmentPrefillById[id]?.arrivalCountry
                        ? {
                            code: segmentPrefillById[id].arrivalCountryCode,
                            name: segmentPrefillById[id].arrivalCountry,
                          }
                        : undefined
                    }
                  />
                  <Field label="Arr Date" required>
                    <input name={`segment_arrDate_${id}`} type="date" required className={inputClass} />
                  </Field>
                  <Field label="Arr Time" required>
                    <input name={`segment_arrTime_${id}`} type="time" required className={inputClass} />
                  </Field>
                  <Field label="Cbn Class" required>
                    <input name={`segment_cabinClass_${id}`} required className={inputClass} />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3: Passengers */}
      <div data-step={3} hidden={step !== 3} className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-card-foreground">Passengers</h2>
            <p className="text-xs text-muted-foreground">At least one passenger is required.</p>
          </div>
          <button
            type="button"
            onClick={addPassenger}
            className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Add Passenger
          </button>
        </div>
        <div className="space-y-5">
          {passengers.map((row, index) => (
            <div key={row.id} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-card-foreground">Passenger {index + 1}</p>
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePassenger(row.id)}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <Field label="Type" required>
                  <select
                    name={`passenger_type_${row.id}`}
                    value={row.paxType}
                    onChange={(e) => setPassengerType(row.id, e.target.value as PaxType)}
                    className={inputClass}
                  >
                    {PAX_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PAX_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <select name={`passenger_title_${row.id}`} defaultValue="Mr" className={inputClass}>
                    {TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="First Name" required>
                  <input name={`passenger_firstName_${row.id}`} required className={inputClass} />
                </Field>
                <Field label="Middle Name">
                  <input name={`passenger_middleName_${row.id}`} className={inputClass} />
                </Field>
                <Field label="Last Name" required>
                  <input name={`passenger_lastName_${row.id}`} required className={inputClass} />
                </Field>
                <Field label="Gender">
                  <select name={`passenger_gender_${row.id}`} defaultValue="Male" className={inputClass}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </Field>
                <Field label="Date of birth">
                  <input name={`passenger_dob_${row.id}`} type="date" className={inputClass} />
                </Field>
                <Field label="Passport No.">
                  <input name={`passenger_passportNo_${row.id}`} className={inputClass} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4: Fare & Review */}
      <div data-step={4} hidden={step !== 4} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">Pricing</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            All amounts are per person basis. Gross is the selling price charged to the customer, Net is what the
            supplier charges us, and MCO is the margin.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] table-fixed text-sm tabular-nums">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium"></th>
                  <th className="pb-2 pr-3 text-right font-medium">Gross</th>
                  <th className="pb-2 pr-3 text-right font-medium">Net</th>
                  <th className="pb-2 text-right font-medium">MCO</th>
                </tr>
              </thead>
              <tbody>
                {paxTypesInUse.map((type) => {
                  const fare = fareInputs[type];
                  const gross = fare?.gross ?? 0;
                  const net = fare?.net ?? 0;
                  const mco = gross - net;
                  return (
                    <tr key={type} className="border-t border-border">
                      <td className="truncate py-2 pr-3 font-medium text-foreground">
                        {PAX_TYPE_LABEL[type]} ({paxCountByType[type]})
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          name={`fare_baseFare_${type}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={0}
                          onChange={(e) => setFareValue(type, "gross", Number(e.target.value) || 0)}
                          className={`${inputClass} w-full min-w-0 text-right`}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          name={`fare_net_${type}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={0}
                          onChange={(e) => setFareValue(type, "net", Number(e.target.value) || 0)}
                          className={`${inputClass} w-full min-w-0 text-right`}
                        />
                      </td>
                      <td className="truncate py-2 text-right font-medium text-foreground">{mco.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="truncate pt-3 pr-3 font-semibold text-foreground">Total Pricing</td>
                  <td className="truncate pt-3 pr-3 text-right font-semibold text-foreground">{estimatedTotal.toFixed(2)}</td>
                  <td className="truncate pt-3 pr-3 text-right font-semibold text-foreground">{totalNet.toFixed(2)}</td>
                  <td className="truncate pt-3 text-right font-semibold text-primary">{mcoAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className={sectionClass}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Rate Remarks">
              <textarea name="rateRemarks" rows={3} className={inputClass} />
            </Field>
            <Field label="Special Request">
              <textarea name="specialRequest" rows={3} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className="mb-3 font-heading text-base font-semibold text-card-foreground">Review</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Passengers</dt>
              <dd className="font-medium text-foreground">{passengers.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Segments</dt>
              <dd className="font-medium text-foreground">{segmentIds.length}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Gross (Selling Price)</dt>
              <dd className="font-medium text-foreground">{estimatedTotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Net (Cost Price)</dt>
              <dd className="font-medium text-foreground">{totalNet.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">MCO (Margin)</dt>
              <dd className="text-base font-semibold text-primary">{mcoAmount.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="rounded-xl border border-secondary/40 px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Next
          </button>
        ) : (
          <ConfirmSubmitButton
            confirmTitle="Create this booking?"
            confirmMessage="This will create the booking and cannot be undone. Please review the details before confirming."
            confirmLabel="Create Booking"
            pendingLabel="Creating…"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Booking
          </ConfirmSubmitButton>
        )}
      </div>
    </form>
  );
}

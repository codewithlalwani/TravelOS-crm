"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { PAX_TYPES, PAX_TYPE_LABEL, type PaxType } from "@/lib/booking/paxTypes";
import { CABIN_CLASS_OPTIONS } from "@/lib/booking/flightOptions";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import { IconChevronDown, IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CityAutocomplete } from "@/components/CityAutocomplete";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

const GDS_OPTIONS = ["Supplier", "Amadeus", "Sabre", "Galileo/Travelport"];
const FARE_TYPE_OPTIONS = ["PUBLISHED", "NET", "IT", "SPECIAL"];
const SEGMENT_STATUS_OPTIONS = ["HK", "KK", "RQ", "UC"];
const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Mstr"];

export interface EditFlightBookingInitialData {
  bookingId: number;
  bookingRef: string;
  customer: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    addressStreet1: string;
    addressCity: string;
    addressState: string;
    addressCountryCode: string;
    addressCountryName: string;
  };
  flight: {
    pnr: string;
    origin: string;
    destination: string;
    cabinClass: string;
    gds: string;
    ticketingSupplier: string;
    tripType: string;
    journeyType: string;
    fareType: string;
    ticketingDeadline: string;
    ticketingDeadlineTime: string;
    supplierReference: string;
    buyCurrency: string;
    sellCurrency: string;
    rateRemarks: string;
    specialRequest: string;
  };
  segments: Array<{
    id: number;
    flightNumber: string;
    airline: string;
    status: string;
    depAirport: string;
    depCity: string;
    depCountryCode: string;
    depCountryName: string;
    depDate: string;
    depTime: string;
    arrAirport: string;
    arrCity: string;
    arrCountryCode: string;
    arrCountryName: string;
    arrDate: string;
    arrTime: string;
    cabinClass: string;
  }>;
  passengers: Array<{
    id: number;
    paxType: PaxType;
    title: string;
    firstName: string;
    middleName: string;
    lastName: string;
    gender: string;
    dob: string;
    passportNo: string;
  }>;
  fares: Array<{ paxType: PaxType; baseFare: number; net: number }>;
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

export function EditFlightBookingForm({
  action,
  initialData,
}: {
  action: (formData: FormData) => void;
  initialData: EditFlightBookingInitialData;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);
  const segmentCountryRefs = useRef<Record<string, RefObject<CountryAutocompleteHandle | null>>>({});
  function getSegmentCountryRef(key: string): RefObject<CountryAutocompleteHandle | null> {
    if (!segmentCountryRefs.current[key]) segmentCountryRefs.current[key] = { current: null };
    return segmentCountryRefs.current[key];
  }

  const segmentMeta = useMemo(() => new Map(initialData.segments.map((s) => [s.id, s])), [initialData.segments]);
  const passengerMeta = useMemo(() => new Map(initialData.passengers.map((p) => [p.id, p])), [initialData.passengers]);

  // Ids only need to be unique within this form (segments/passengers are replaced wholesale on
  // save, not reconciled by id) — a negative sentinel is a safe "no rows yet" fallback that can't
  // collide with real database ids.
  const nextSegmentId = useRef(initialData.segments.reduce((max, s) => Math.max(max, s.id), 0) + 1);
  const nextPassengerId = useRef(initialData.passengers.reduce((max, p) => Math.max(max, p.id), 0) + 1);

  const [segmentIds, setSegmentIds] = useState<number[]>(
    initialData.segments.length > 0 ? initialData.segments.map((s) => s.id) : [-1]
  );
  const [collapsedSegments, setCollapsedSegments] = useState<Set<number>>(new Set());
  const [passengers, setPassengers] = useState<Array<{ id: number; paxType: PaxType }>>(
    initialData.passengers.length > 0
      ? initialData.passengers.map((p) => ({ id: p.id, paxType: p.paxType }))
      : [{ id: -1, paxType: "ADT" }]
  );
  const [fareInputs, setFareInputs] = useState<Record<string, { gross: number; net: number }>>(() => {
    const map: Record<string, { gross: number; net: number }> = {};
    for (const f of initialData.fares) map[f.paxType] = { gross: f.baseFare, net: f.net };
    return map;
  });

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
      <input type="hidden" name="bookingId" value={initialData.bookingId} />
      <input type="hidden" name="segmentIds" value={segmentIds.join(",")} />
      <input type="hidden" name="passengerIds" value={passengers.map((p) => p.id).join(",")} />

      <div className={sectionClass}>
        <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Customer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="First Name" required>
            <input name="customerFirstName" required defaultValue={initialData.customer.firstName} className={inputClass} />
          </Field>
          <Field label="Middle Name">
            <input name="customerMiddleName" defaultValue={initialData.customer.middleName} className={inputClass} />
          </Field>
          <Field label="Last Name" required>
            <input name="customerLastName" required defaultValue={initialData.customer.lastName} className={inputClass} />
          </Field>
          <Field label="Email" required>
            <input name="customerEmail" type="email" required defaultValue={initialData.customer.email} className={inputClass} />
          </Field>
          <Field label="Phone (optional)">
            <input name="customerPhone" defaultValue={initialData.customer.phone} className={inputClass} />
          </Field>
          <Field label="Address" required>
            <input
              name="customerAddressStreet1"
              required
              defaultValue={initialData.customer.addressStreet1}
              className={inputClass}
            />
          </Field>
          <CityAutocomplete
            name="customerAddressCity"
            label="City"
            required
            countryRef={customerCountryRef}
            stateRef={customerStateRef}
            defaultValue={initialData.customer.addressCity}
          />
          <Field label="State" required>
            <input
              ref={customerStateRef}
              name="customerAddressState"
              required
              defaultValue={initialData.customer.addressState}
              className={inputClass}
            />
          </Field>
          <CountryAutocomplete
            ref={customerCountryRef}
            name="customerAddressCountry"
            label="Country"
            required
            defaultValue={
              initialData.customer.addressCountryCode
                ? { code: initialData.customer.addressCountryCode, name: initialData.customer.addressCountryName }
                : undefined
            }
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Manage Flight Details</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <Field label="Departure Airport" required>
            <input name="origin" required defaultValue={initialData.flight.origin} placeholder="e.g. JFK" className={inputClass} />
          </Field>
          <Field label="Arrival Airport" required>
            <input
              name="destination"
              required
              defaultValue={initialData.flight.destination}
              placeholder="e.g. LHR"
              className={inputClass}
            />
          </Field>
          <Field label="PNR Number" required>
            <input name="pnr" required defaultValue={initialData.flight.pnr} className={inputClass} />
          </Field>
          <Field label="Trip Type" required>
            <select name="tripType" required defaultValue={initialData.flight.tripType || "One Way"} className={inputClass}>
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
                  defaultChecked={initialData.flight.journeyType !== "International"}
                  className="accent-primary"
                />
                Domestic
              </label>
              <label className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name="journeyType"
                  value="International"
                  defaultChecked={initialData.flight.journeyType === "International"}
                  className="accent-primary"
                />
                International
              </label>
            </div>
          </Field>
          <Field label="Cabin Class" required>
            <select name="cabinClass" required defaultValue={initialData.flight.cabinClass || ""} className={inputClass}>
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
            <select name="gds" required defaultValue={initialData.flight.gds || "Supplier"} className={inputClass}>
              {GDS_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ticketing Supplier" required>
            <input
              name="ticketingSupplier"
              required
              defaultValue={initialData.flight.ticketingSupplier}
              placeholder="Select supplier"
              className={inputClass}
            />
          </Field>
          <Field label="Fare Type" required>
            <select name="fareType" required defaultValue={initialData.flight.fareType || "PUBLISHED"} className={inputClass}>
              {FARE_TYPE_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ticketing Deadline">
            <input name="ticketingDeadline" type="date" defaultValue={initialData.flight.ticketingDeadline} className={inputClass} />
          </Field>
          <Field label="Time">
            <input
              name="ticketingDeadlineTime"
              type="time"
              defaultValue={initialData.flight.ticketingDeadlineTime || "23:59"}
              className={inputClass}
            />
          </Field>
          <Field label="Supplier Reference">
            <input name="supplierReference" defaultValue={initialData.flight.supplierReference} className={inputClass} />
          </Field>
          <Field label="Buy Currency" required>
            <select name="buyCurrency" required defaultValue={initialData.flight.buyCurrency || "USD"} className={inputClass}>
              {BOOKING_CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sell Currency" required>
            <select name="sellCurrency" required defaultValue={initialData.flight.sellCurrency || "USD"} className={inputClass}>
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
          {segmentIds.map((id, index) => {
            const meta = segmentMeta.get(id);
            return (
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
                    <input
                      name={`segment_flightNumber_${id}`}
                      required
                      defaultValue={meta?.flightNumber}
                      placeholder="e.g. AA123"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Airline" required>
                    <input name={`segment_airline_${id}`} required defaultValue={meta?.airline} className={inputClass} />
                  </Field>
                  <Field label="Status" required>
                    <select name={`segment_status_${id}`} required defaultValue={meta?.status || "HK"} className={inputClass}>
                      {SEGMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dep Airport" required>
                    <input name={`segment_depAirport_${id}`} required defaultValue={meta?.depAirport} className={inputClass} />
                  </Field>
                  <CityAutocomplete
                    name={`segment_depCity_${id}`}
                    label="Dep City"
                    required
                    countryRef={getSegmentCountryRef(`dep_${id}`)}
                    defaultValue={meta?.depCity}
                  />
                  <CountryAutocomplete
                    ref={getSegmentCountryRef(`dep_${id}`)}
                    name={`segment_depCountry_${id}`}
                    label="Dep Country"
                    required
                    defaultValue={meta?.depCountryCode ? { code: meta.depCountryCode, name: meta.depCountryName } : undefined}
                  />
                  <Field label="Dep Date" required>
                    <input name={`segment_depDate_${id}`} type="date" required defaultValue={meta?.depDate} className={inputClass} />
                  </Field>
                  <Field label="Dep Time" required>
                    <input name={`segment_depTime_${id}`} type="time" required defaultValue={meta?.depTime} className={inputClass} />
                  </Field>
                  <Field label="Arr Airport" required>
                    <input name={`segment_arrAirport_${id}`} required defaultValue={meta?.arrAirport} className={inputClass} />
                  </Field>
                  <CityAutocomplete
                    name={`segment_arrCity_${id}`}
                    label="Arr City"
                    required
                    countryRef={getSegmentCountryRef(`arr_${id}`)}
                    defaultValue={meta?.arrCity}
                  />
                  <CountryAutocomplete
                    ref={getSegmentCountryRef(`arr_${id}`)}
                    name={`segment_arrCountry_${id}`}
                    label="Arr Country"
                    required
                    defaultValue={meta?.arrCountryCode ? { code: meta.arrCountryCode, name: meta.arrCountryName } : undefined}
                  />
                  <Field label="Arr Date" required>
                    <input name={`segment_arrDate_${id}`} type="date" required defaultValue={meta?.arrDate} className={inputClass} />
                  </Field>
                  <Field label="Arr Time" required>
                    <input name={`segment_arrTime_${id}`} type="time" required defaultValue={meta?.arrTime} className={inputClass} />
                  </Field>
                  <Field label="Cbn Class" required>
                    <input name={`segment_cabinClass_${id}`} required defaultValue={meta?.cabinClass} className={inputClass} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={sectionClass}>
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
          {passengers.map((row, index) => {
            const meta = passengerMeta.get(row.id);
            return (
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
                    <select name={`passenger_title_${row.id}`} defaultValue={meta?.title || "Mr"} className={inputClass}>
                      {TITLE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="First Name" required>
                    <input name={`passenger_firstName_${row.id}`} required defaultValue={meta?.firstName} className={inputClass} />
                  </Field>
                  <Field label="Middle Name">
                    <input name={`passenger_middleName_${row.id}`} defaultValue={meta?.middleName} className={inputClass} />
                  </Field>
                  <Field label="Last Name" required>
                    <input name={`passenger_lastName_${row.id}`} required defaultValue={meta?.lastName} className={inputClass} />
                  </Field>
                  <Field label="Gender">
                    <select name={`passenger_gender_${row.id}`} defaultValue={meta?.gender || "Male"} className={inputClass}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of birth">
                    <input name={`passenger_dob_${row.id}`} type="date" defaultValue={meta?.dob} className={inputClass} />
                  </Field>
                  <Field label="Passport No.">
                    <input name={`passenger_passportNo_${row.id}`} defaultValue={meta?.passportNo} className={inputClass} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                        defaultValue={gross}
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
                        defaultValue={net}
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
            <textarea name="rateRemarks" rows={3} defaultValue={initialData.flight.rateRemarks} className={inputClass} />
          </Field>
          <Field label="Special Request">
            <textarea name="specialRequest" rows={3} defaultValue={initialData.flight.specialRequest} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <ConfirmSubmitButton
          confirmTitle="Save changes to this booking?"
          confirmMessage="This will update the booking's flight, passenger and fare details."
          confirmLabel="Save Changes"
          pendingLabel="Saving…"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save Changes
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}

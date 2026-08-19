"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  CAR_BOOKING_STATUS_OPTIONS,
  SUPPLIER_TYPE_OPTIONS,
  DRIVER_TITLE_OPTIONS,
} from "@/lib/booking/carOptions";
import { IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";

export interface CarBookingFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

const initialFormState: CarBookingFormState = {};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const inputErrorClass =
  "w-full rounded-xl border border-danger bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-danger";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

const STEPS = ["Manage Car Details", "Driver Details", "Charges & Review"] as const;

const STEP_FIELDS: string[][] = [
  [
    "pickupLocation",
    "pickupCity",
    "pickupDateTime",
    "dropoffLocation",
    "dropoffCity",
    "dropoffDateTime",
    "currency",
    "bookingStatus",
    "supplierRef",
    "supplierType",
    "supplier",
    "vehicleCode",
    "vehicleName",
    "maxPax",
    "maxLuggage",
    "noOfVehicles",
  ],
  [
    "contactTitle",
    "contactFirstName",
    "contactLastName",
    "contactEmail",
    "contactCountryCode",
    "contactMobile",
    "driver0Title",
    "driver0FirstName",
    "driver0LastName",
    "customerAddressStreet1",
    "customerAddressCity",
    "customerAddressState",
    "customerAddressCountry",
  ],
  ["grossAmount", "netAmount", "rateRemarks", "specialRequest"],
];

function stepForField(name: string): number {
  if (name.startsWith("driver_")) return 1;
  for (let i = 0; i < STEP_FIELDS.length; i++) {
    if (STEP_FIELDS[i].includes(name)) return i;
  }
  return 0;
}

interface DriverRow {
  id: number;
}

function formatDateTime(value: string) {
  const [date, time] = value.split("T");
  return time ? `${date} ${time}` : date;
}

/** Billable rental days between two datetime-local values — any started day counts, so a 26h rental is 2 days. */
function rentalDaysBetween(pickup: string, dropoff: string): number {
  if (!pickup || !dropoff) return 0;
  const from = new Date(pickup);
  const to = new Date(dropoff);
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function Field({
  label,
  required,
  className,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function NewCarBookingWizard({
  action,
}: {
  action: (prevState: CarBookingFormState, formData: FormData) => Promise<CarBookingFormState>;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const fieldErrors = state.fieldErrors || {};

  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);

  const [driverMode, setDriverMode] = useState<"myself" | "someone_else">("myself");

  const nextDriverId = useRef(1);
  const [additionalDriverIds, setAdditionalDriverIds] = useState<DriverRow[]>([]);

  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [noOfVehicles, setNoOfVehicles] = useState(1);
  const pickupDateTime = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : "";
  const dropoffDateTime = dropoffDate && dropoffTime ? `${dropoffDate}T${dropoffTime}` : "";

  const [grossAmount, setGrossAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    const firstErrorField = Object.keys(fieldErrors)[0];
    if (firstErrorField) setStep(stepForField(firstErrorField));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function cls(name: string) {
    return fieldErrors[name] ? inputErrorClass : inputClass;
  }

  function goToStep(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (section) {
      const invalid = section.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    goToStep(Math.min(step + 1, STEPS.length - 1));
  }

  function goBack() {
    goToStep(Math.max(step - 1, 0));
  }

  function addDriver() {
    const id = nextDriverId.current++;
    setAdditionalDriverIds((rows) => [...rows, { id }]);
  }

  function removeDriver(id: number) {
    setAdditionalDriverIds((rows) => rows.filter((r) => r.id !== id));
  }

  const mcoAmount = grossAmount - netAmount;
  const mcoClass = mcoAmount < 0 ? "text-danger" : "text-primary";
  const rentalDays = rentalDaysBetween(pickupDateTime, dropoffDateTime);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="driverMode" value={driverMode} />
      <input type="hidden" name="driverIds" value={additionalDriverIds.map((d) => d.id).join(",")} />
      <input type="hidden" name="dropoffDifferentLocation" value="1" />

      {state.error && (
        <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</div>
      )}

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && goToStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                i === step
                  ? "border-primary bg-primary/10 text-primary"
                  : i < step
                  ? "border-secondary/40 bg-secondary/10 text-secondary-foreground cursor-pointer"
                  : "border-border bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Step 0: Manage Car Details */}
      <div data-step={0} hidden={step !== 0} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">
            Pickup Details/Dropoff Details
          </h2>
          <input type="hidden" name="pickupDateTime" value={pickupDateTime} />
          <input type="hidden" name="dropoffDateTime" value={dropoffDateTime} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <CityAutocomplete
                name="pickupCity"
                label="Pickup City"
                required
                placeholder="City the car is collected in"
                onValueChange={setPickupCity}
              />
              {fieldErrors.pickupCity && <p className="mt-1 text-xs text-danger">{fieldErrors.pickupCity}</p>}
            </div>
            <Field label="Pickup Date" required error={fieldErrors.pickupDateTime}>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className={cls("pickupDateTime")}
              />
            </Field>
            <Field label="Pickup Time" required>
              <input
                type="time"
                required
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className={cls("pickupDateTime")}
              />
            </Field>
            <Field label="Pickup Location" required error={fieldErrors.pickupLocation}>
              <input
                name="pickupLocation"
                required
                placeholder="Free text address / landmark"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className={cls("pickupLocation")}
              />
            </Field>

            <div>
              <CityAutocomplete
                name="dropoffCity"
                label="Dropoff City"
                required
                placeholder="City the car is returned in"
                onValueChange={setDropoffCity}
              />
              {fieldErrors.dropoffCity && <p className="mt-1 text-xs text-danger">{fieldErrors.dropoffCity}</p>}
            </div>
            <Field label="Dropoff Date" required error={fieldErrors.dropoffDateTime}>
              <input
                type="date"
                required
                min={pickupDate || undefined}
                value={dropoffDate}
                onChange={(e) => setDropoffDate(e.target.value)}
                className={cls("dropoffDateTime")}
              />
            </Field>
            <Field label="Dropoff Time" required>
              <input
                type="time"
                required
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className={cls("dropoffDateTime")}
              />
            </Field>
            <Field label="Dropoff Location" required error={fieldErrors.dropoffLocation}>
              <input
                name="dropoffLocation"
                required
                placeholder="Free text address / landmark"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                className={cls("dropoffLocation")}
              />
            </Field>

            <Field label="Currency" required>
              <select name="currency" required defaultValue="USD" className={inputClass}>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Booking Status" required error={fieldErrors.bookingStatus}>
              <select name="bookingStatus" required defaultValue="" className={cls("bookingStatus")}>
                <option value="" disabled>
                  Select
                </option>
                {CAR_BOOKING_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier Ref" required error={fieldErrors.supplierRef}>
              <input name="supplierRef" required className={cls("supplierRef")} />
            </Field>
            <Field label="Supplier Type" required>
              <div className="flex h-full items-center gap-4 pt-1">
                {SUPPLIER_TYPE_OPTIONS.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm text-foreground">
                    <input
                      type="radio"
                      name="supplierType"
                      value={t}
                      defaultChecked={t === "Offline"}
                      className="accent-primary"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Supplier" required error={fieldErrors.supplier}>
              <input name="supplier" required placeholder="Select supplier" className={cls("supplier")} />
            </Field>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Vehicle Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Vehicle Code">
              <input name="vehicleCode" className={inputClass} />
            </Field>
            <Field label="Vehicle Name">
              <input name="vehicleName" className={inputClass} />
            </Field>
            <Field label="Max Pax">
              <input name="maxPax" type="number" min={0} className={inputClass} />
            </Field>
            <Field label="Max Luggage">
              <input name="maxLuggage" type="number" min={0} className={inputClass} />
            </Field>
            <Field label="No Of Vehicles">
              <select
                name="noOfVehicles"
                value={noOfVehicles}
                onChange={(e) => setNoOfVehicles(Number(e.target.value) || 1)}
                className={inputClass}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Step 1: Driver Details */}
      <div data-step={1} hidden={step !== 1} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">
            Pax Information - Who Will Drive
          </h2>
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                checked={driverMode === "myself"}
                onChange={() => setDriverMode("myself")}
                className="accent-primary"
              />
              Myself
            </label>
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                checked={driverMode === "someone_else"}
                onChange={() => setDriverMode("someone_else")}
                className="accent-primary"
              />
              Someone Else
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <Field label="Title" className="lg:col-span-2">
              <select name="contactTitle" defaultValue="Mr" className={inputClass}>
                {DRIVER_TITLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="First Name" required className="lg:col-span-2" error={fieldErrors.contactFirstName}>
              <input
                name="contactFirstName"
                required
                placeholder="First name"
                className={cls("contactFirstName")}
              />
            </Field>
            <Field label="Last Name" required className="lg:col-span-2" error={fieldErrors.contactLastName}>
              <input name="contactLastName" required placeholder="Last name" className={cls("contactLastName")} />
            </Field>
            <Field label="Email Address" required className="lg:col-span-3" error={fieldErrors.contactEmail}>
              <input
                name="contactEmail"
                type="email"
                required
                placeholder="Booking voucher will be sent here"
                className={cls("contactEmail")}
              />
            </Field>
            <Field label="Mobile Number" required className="lg:col-span-3" error={fieldErrors.contactMobile}>
              <div className="flex gap-2">
                <CountryCodeSelect name="contactCountryCode" defaultValue="+91" />
                <input
                  name="contactMobile"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{6,15}"
                  maxLength={15}
                  placeholder="Mobile number"
                  required
                  className={cls("contactMobile")}
                />
              </div>
            </Field>
          </div>

          {driverMode === "someone_else" && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-card-foreground">Driver</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Title">
                  <select name="driver0Title" defaultValue="Mr" className={inputClass}>
                    {DRIVER_TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="First Name" required error={fieldErrors.driver0FirstName}>
                  <input name="driver0FirstName" required className={cls("driver0FirstName")} />
                </Field>
                <Field label="Last Name" required error={fieldErrors.driver0LastName}>
                  <input name="driver0LastName" required className={cls("driver0LastName")} />
                </Field>
              </div>
            </div>
          )}

          {additionalDriverIds.length > 0 && (
            <div className="mt-5 space-y-3">
              {additionalDriverIds.map((row, index) => (
                <div key={row.id} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-card-foreground">Driver {index + 2}</p>
                    <button
                      type="button"
                      onClick={() => removeDriver(row.id)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Title">
                      <select name={`driver_title_${row.id}`} defaultValue="Mr" className={inputClass}>
                        {DRIVER_TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="First Name" required error={fieldErrors[`driver_firstName_${row.id}`]}>
                      <input
                        name={`driver_firstName_${row.id}`}
                        required
                        className={cls(`driver_firstName_${row.id}`)}
                      />
                    </Field>
                    <Field label="Last Name" required error={fieldErrors[`driver_lastName_${row.id}`]}>
                      <input
                        name={`driver_lastName_${row.id}`}
                        required
                        className={cls(`driver_lastName_${row.id}`)}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addDriver}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Add Driver
          </button>
        </div>

        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Billing Address</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Address">
              <input name="customerAddressStreet1" className={inputClass} />
            </Field>
            <CityAutocomplete
              name="customerAddressCity"
              label="City"
              countryRef={customerCountryRef}
              stateRef={customerStateRef}
            />
            <Field label="State">
              <input ref={customerStateRef} name="customerAddressState" className={inputClass} />
            </Field>
            <CountryAutocomplete ref={customerCountryRef} name="customerAddressCountry" label="Country" />
          </div>
        </div>
      </div>

      {/* Step 2: Charges & Review */}
      <div data-step={2} hidden={step !== 2} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">Pricing</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Gross is the selling price charged to the customer, Net is what the supplier charges us, and MCO is the margin.
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
                <tr className="border-t border-border">
                  <td className="truncate py-2 pr-3 font-medium text-foreground">
                    Car Rental Charges ({noOfVehicles} vehicle{noOfVehicles === 1 ? "" : "s"}
                    {rentalDays > 0 ? ` × ${rentalDays} day${rentalDays === 1 ? "" : "s"}` : ""})
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name="grossAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={0}
                      onChange={(e) => setGrossAmount(Number(e.target.value) || 0)}
                      className={`${inputClass} w-full min-w-0 text-right`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name="netAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={0}
                      onChange={(e) => setNetAmount(Number(e.target.value) || 0)}
                      className={`${inputClass} w-full min-w-0 text-right`}
                    />
                  </td>
                  <td className="truncate py-2 text-right font-medium text-foreground">{mcoAmount.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="truncate pt-3 pr-3 font-semibold text-foreground">Total Pricing</td>
                  <td className="truncate pt-3 pr-3 text-right font-semibold text-foreground">{grossAmount.toFixed(2)}</td>
                  <td className="truncate pt-3 pr-3 text-right font-semibold text-foreground">{netAmount.toFixed(2)}</td>
                  <td className={`truncate pt-3 text-right font-semibold ${mcoClass}`}>{mcoAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {mcoAmount < 0 && (
            <p className="mt-3 text-xs text-danger">
              Net is higher than gross — this booking is being sold at a loss.
            </p>
          )}
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
              <dt className="text-muted-foreground">Pickup</dt>
              <dd className="text-right font-medium text-foreground">
                {pickupLocation || "—"}
                {pickupCity && (
                  <span className="block text-xs font-normal text-muted-foreground">{pickupCity}</span>
                )}
                {pickupDateTime && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {formatDateTime(pickupDateTime)}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Dropoff</dt>
              <dd className="text-right font-medium text-foreground">
                {dropoffLocation || "—"}
                {dropoffCity && (
                  <span className="block text-xs font-normal text-muted-foreground">{dropoffCity}</span>
                )}
                {dropoffDateTime && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {formatDateTime(dropoffDateTime)}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Rental Duration</dt>
              <dd className="font-medium text-foreground">
                {rentalDays > 0 ? `${rentalDays} day${rentalDays === 1 ? "" : "s"}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Vehicles</dt>
              <dd className="font-medium text-foreground">{noOfVehicles}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Drivers</dt>
              <dd className="font-medium text-foreground">{1 + additionalDriverIds.length}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Gross (Selling Price)</dt>
              <dd className="font-medium text-foreground">{grossAmount.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Net (Cost Price)</dt>
              <dd className="font-medium text-foreground">{netAmount.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">MCO (Margin)</dt>
              <dd className={`text-base font-semibold ${mcoClass}`}>{mcoAmount.toFixed(2)}</dd>
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

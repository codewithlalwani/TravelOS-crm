"use client";

import { useActionState, useRef, useState } from "react";
import {
  STATION_TYPE_OPTIONS,
  CAR_BOOKING_STATUS_OPTIONS,
  SUPPLIER_TYPE_OPTIONS,
  DRIVER_TITLE_OPTIONS,
} from "@/lib/booking/carOptions";
import { IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import type { CarBookingFormState } from "../../actions";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const inputErrorClass =
  "w-full rounded-xl border border-danger bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-danger";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

const initialFormState: CarBookingFormState = {};

export interface EditCarBookingInitialData {
  bookingId: number;
  bookingRef: string;
  contact: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    countryCode: string;
    mobile: string;
  };
  customerAddress: {
    street1: string;
    city: string;
    state: string;
    countryCode: string;
    countryName: string;
  };
  /** All driver passenger rows for this booking, in order; the first is the lead driver. */
  drivers: Array<{ id: number; title: string; firstName: string; lastName: string }>;
  car: {
    pickupLocation: string;
    pickupCity: string;
    pickupCountryCode: string;
    pickupCountryName: string;
    pickupState: string;
    pickupStationType: string;
    pickupStation: string;
    /** `YYYY-MM-DDTHH:mm`, ready for a datetime-local input. */
    pickupDateTime: string;
    dropoffDifferentLocation: boolean;
    dropoffLocation: string;
    dropoffCity: string;
    dropoffCountryCode: string;
    dropoffCountryName: string;
    dropoffState: string;
    dropoffStationType: string;
    dropoffStation: string;
    dropoffDateTime: string;
    pickupMeetingPoint: string;
    meetingPoint: string;
    rateRemarks: string;
    specialRequest: string;
    bookingStatus: string;
    supplierRef: string;
    supplierType: string;
    supplier: string;
    vehicleCode: string;
    vehicleName: string;
    maxPax: string;
    maxLuggage: string;
    noOfVehicles: number;
  };
  pricing: {
    currency: string;
    grossAmount: number;
    netAmount: number;
  };
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

/** Billable rental days — any started day counts, so a 26h rental is 2 days. */
function rentalDaysBetween(pickup: string, dropoff: string): number {
  if (!pickup || !dropoff) return 0;
  const ms = new Date(dropoff).getTime() - new Date(pickup).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function EditCarBookingForm({
  action,
  initialData,
}: {
  action: (prevState: CarBookingFormState, formData: FormData) => Promise<CarBookingFormState>;
  initialData: EditCarBookingInitialData;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const fieldErrors = state.fieldErrors || {};

  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);
  const pickupCountryRef = useRef<CountryAutocompleteHandle>(null);
  const pickupStateRef = useRef<HTMLInputElement>(null);
  const dropoffCountryRef = useRef<CountryAutocompleteHandle>(null);
  const dropoffStateRef = useRef<HTMLInputElement>(null);

  // The create wizard's "myself"/"someone else" toggle is a UI convenience only — nothing
  // persists it, so editing always shows the actual driver list ("someone else" mode).
  const [driverMode, setDriverMode] = useState<"myself" | "someone_else">("someone_else");

  const leadDriver = initialData.drivers[0];
  const extraDrivers = initialData.drivers.slice(1);

  const nextDriverId = useRef(extraDrivers.reduce((max, d) => Math.max(max, d.id), 0) + 1);
  const [additionalDriverIds, setAdditionalDriverIds] = useState<Array<{ id: number }>>(
    extraDrivers.map((d) => ({ id: d.id }))
  );
  const driverMeta = new Map(extraDrivers.map((d) => [d.id, d]));

  const [pickupLocation, setPickupLocation] = useState(initialData.car.pickupLocation);
  const [pickupStationType, setPickupStationType] = useState(initialData.car.pickupStationType);
  const [pickupDateTime, setPickupDateTime] = useState(initialData.car.pickupDateTime);
  const [dropoffDifferent, setDropoffDifferent] = useState(initialData.car.dropoffDifferentLocation);
  const [dropoffLocation, setDropoffLocation] = useState(initialData.car.dropoffLocation);
  const [dropoffStationType, setDropoffStationType] = useState(initialData.car.dropoffStationType);
  const [dropoffDateTime, setDropoffDateTime] = useState(initialData.car.dropoffDateTime);
  const [noOfVehicles, setNoOfVehicles] = useState(initialData.car.noOfVehicles);

  const [grossAmount, setGrossAmount] = useState(initialData.pricing.grossAmount);
  const [netAmount, setNetAmount] = useState(initialData.pricing.netAmount);

  function cls(name: string) {
    return fieldErrors[name] ? inputErrorClass : inputClass;
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
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="bookingId" value={initialData.bookingId} />
      <input type="hidden" name="driverMode" value={driverMode} />
      <input type="hidden" name="driverIds" value={additionalDriverIds.map((d) => d.id).join(",")} />
      <input type="hidden" name="dropoffDifferentLocation" value={dropoffDifferent ? "1" : ""} />

      {state.error && (
        <div className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</div>
      )}

      <div className={sectionClass}>
        <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">
          Pickup Details/Dropoff Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Pickup Location" required error={fieldErrors.pickupLocation}>
            <input
              name="pickupLocation"
              required
              placeholder="City or address"
              value={pickupLocation}
              onChange={(e) => {
                setPickupLocation(e.target.value);
                if (!dropoffDifferent) setDropoffLocation(e.target.value);
              }}
              className={cls("pickupLocation")}
            />
          </Field>
          <div>
            <CityAutocomplete
              name="pickupCity"
              label="Pickup City"
              required
              placeholder="City the car is collected in"
              countryRef={pickupCountryRef}
              stateRef={pickupStateRef}
              defaultValue={initialData.car.pickupCity}
            />
            {fieldErrors.pickupCity && <p className="mt-1 text-xs text-danger">{fieldErrors.pickupCity}</p>}
          </div>
          <div>
            <CountryAutocomplete
              ref={pickupCountryRef}
              name="pickupCountry"
              label="Pickup Country"
              required
              defaultValue={{ code: initialData.car.pickupCountryCode, name: initialData.car.pickupCountryName }}
            />
            {fieldErrors.pickupCountry && <p className="mt-1 text-xs text-danger">{fieldErrors.pickupCountry}</p>}
          </div>
          {/* Auto-filled from the picked city's Google Places details, still editable for places Google leaves blank. */}
          <Field label="Pickup State" error={fieldErrors.pickupState}>
            <input
              ref={pickupStateRef}
              name="pickupState"
              placeholder="State / province"
              defaultValue={initialData.car.pickupState}
              className={cls("pickupState")}
            />
          </Field>
          <Field label="Pickup Station Type" required error={fieldErrors.pickupStationType}>
            <select
              name="pickupStationType"
              required
              value={pickupStationType}
              onChange={(e) => {
                setPickupStationType(e.target.value);
                if (!dropoffDifferent) setDropoffStationType(e.target.value);
              }}
              className={cls("pickupStationType")}
            >
              {STATION_TYPE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pickup Station">
            <input
              name="pickupStation"
              defaultValue={initialData.car.pickupStation}
              placeholder="Select PickUp Station"
              className={inputClass}
            />
          </Field>
          <Field label="Pickup Date & Time" required error={fieldErrors.pickupDateTime}>
            <input
              name="pickupDateTime"
              type="datetime-local"
              required
              value={pickupDateTime}
              onChange={(e) => setPickupDateTime(e.target.value)}
              className={cls("pickupDateTime")}
            />
          </Field>

          <Field label="Dropoff Different Location" className="lg:col-span-4">
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={dropoffDifferent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDropoffDifferent(checked);
                  if (!checked) {
                    setDropoffLocation(pickupLocation);
                    setDropoffStationType(pickupStationType);
                  }
                }}
                className="accent-primary"
              />
              Dropoff is at a different location
            </label>
            {!dropoffDifferent && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dropoff mirrors the pickup location, city, country, state and station type.
              </p>
            )}
          </Field>
          <Field label="Dropoff Location" required={dropoffDifferent} error={fieldErrors.dropoffLocation}>
            <input
              name="dropoffLocation"
              required={dropoffDifferent}
              disabled={!dropoffDifferent}
              placeholder="City or address"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              className={`${cls("dropoffLocation")} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>
          {/* Dropoff city/country only render when the dropoff really differs — otherwise the action mirrors the pickup values. */}
          {dropoffDifferent && (
            <>
              <div>
                <CityAutocomplete
                  name="dropoffCity"
                  label="Dropoff City"
                  required
                  placeholder="City the car is returned in"
                  countryRef={dropoffCountryRef}
                  stateRef={dropoffStateRef}
                  defaultValue={initialData.car.dropoffCity}
                />
                {fieldErrors.dropoffCity && <p className="mt-1 text-xs text-danger">{fieldErrors.dropoffCity}</p>}
              </div>
              <div>
                <CountryAutocomplete
                  ref={dropoffCountryRef}
                  name="dropoffCountry"
                  label="Dropoff Country"
                  required
                  defaultValue={{
                    code: initialData.car.dropoffCountryCode,
                    name: initialData.car.dropoffCountryName,
                  }}
                />
                {fieldErrors.dropoffCountry && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.dropoffCountry}</p>
                )}
              </div>
              <Field label="Dropoff State" error={fieldErrors.dropoffState}>
                <input
                  ref={dropoffStateRef}
                  name="dropoffState"
                  placeholder="State / province"
                  defaultValue={initialData.car.dropoffState}
                  className={cls("dropoffState")}
                />
              </Field>
            </>
          )}
          <Field label="Dropoff Station Type" required={dropoffDifferent} error={fieldErrors.dropoffStationType}>
            {/* A disabled select is never submitted, so mirror the pickup value through a hidden input. */}
            {!dropoffDifferent && <input type="hidden" name="dropoffStationType" value={dropoffStationType} />}
            <select
              name="dropoffStationType"
              required
              disabled={!dropoffDifferent}
              value={dropoffStationType}
              onChange={(e) => setDropoffStationType(e.target.value)}
              className={`${cls("dropoffStationType")} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {STATION_TYPE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dropoff Station">
            <input
              name="dropoffStation"
              defaultValue={initialData.car.dropoffStation}
              placeholder="Select Dropoff Station"
              disabled={!dropoffDifferent}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>
          <Field label="Dropoff Date & Time" required error={fieldErrors.dropoffDateTime}>
            <input
              name="dropoffDateTime"
              type="datetime-local"
              required
              min={pickupDateTime || undefined}
              value={dropoffDateTime}
              onChange={(e) => setDropoffDateTime(e.target.value)}
              className={cls("dropoffDateTime")}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pickup Meeting Point">
            <textarea
              name="pickupMeetingPoint"
              rows={3}
              defaultValue={initialData.car.pickupMeetingPoint}
              className={inputClass}
            />
          </Field>
          <Field label="Dropoff Meeting Point">
            <textarea
              name="meetingPoint"
              rows={3}
              defaultValue={initialData.car.meetingPoint}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className={sectionClass}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Booking Status" required error={fieldErrors.bookingStatus}>
            <select
              name="bookingStatus"
              required
              defaultValue={initialData.car.bookingStatus}
              className={cls("bookingStatus")}
            >
              {CAR_BOOKING_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supplier Ref" required error={fieldErrors.supplierRef}>
            <input
              name="supplierRef"
              required
              defaultValue={initialData.car.supplierRef}
              className={cls("supplierRef")}
            />
          </Field>
          <Field label="Supplier Type" required>
            <div className="flex h-full items-center gap-4 pt-1">
              {SUPPLIER_TYPE_OPTIONS.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-foreground">
                  <input
                    type="radio"
                    name="supplierType"
                    value={t}
                    defaultChecked={t === initialData.car.supplierType}
                    className="accent-primary"
                  />
                  {t}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Supplier" required error={fieldErrors.supplier}>
            <input
              name="supplier"
              required
              defaultValue={initialData.car.supplier}
              placeholder="Select supplier"
              className={cls("supplier")}
            />
          </Field>
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Vehicle Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Vehicle Code">
            <input name="vehicleCode" defaultValue={initialData.car.vehicleCode} className={inputClass} />
          </Field>
          <Field label="Vehicle Name">
            <input name="vehicleName" defaultValue={initialData.car.vehicleName} className={inputClass} />
          </Field>
          <Field label="Max Pax">
            <input
              name="maxPax"
              type="number"
              min={0}
              defaultValue={initialData.car.maxPax}
              className={inputClass}
            />
          </Field>
          <Field label="Max Luggage">
            <input
              name="maxLuggage"
              type="number"
              min={0}
              defaultValue={initialData.car.maxLuggage}
              className={inputClass}
            />
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
            <select
              name="contactTitle"
              defaultValue={initialData.contact.title || "Mr"}
              className={inputClass}
            >
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
              defaultValue={initialData.contact.firstName}
              placeholder="First name"
              className={cls("contactFirstName")}
            />
          </Field>
          <Field label="Last Name" required className="lg:col-span-2" error={fieldErrors.contactLastName}>
            <input
              name="contactLastName"
              required
              defaultValue={initialData.contact.lastName}
              placeholder="Last name"
              className={cls("contactLastName")}
            />
          </Field>
          <Field label="Email Address" required className="lg:col-span-3" error={fieldErrors.contactEmail}>
            <input
              name="contactEmail"
              type="email"
              required
              defaultValue={initialData.contact.email}
              placeholder="Booking voucher will be sent here"
              className={cls("contactEmail")}
            />
          </Field>
          <Field label="Mobile Number" required className="lg:col-span-3" error={fieldErrors.contactMobile}>
            <div className="flex gap-2">
              <CountryCodeSelect name="contactCountryCode" defaultValue={initialData.contact.countryCode || "+91"} />
              <input
                name="contactMobile"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{6,15}"
                maxLength={15}
                defaultValue={initialData.contact.mobile}
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
                <select name="driver0Title" defaultValue={leadDriver?.title || "Mr"} className={inputClass}>
                  {DRIVER_TITLE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="First Name" required error={fieldErrors.driver0FirstName}>
                <input
                  name="driver0FirstName"
                  required
                  defaultValue={leadDriver?.firstName}
                  className={cls("driver0FirstName")}
                />
              </Field>
              <Field label="Last Name" required error={fieldErrors.driver0LastName}>
                <input
                  name="driver0LastName"
                  required
                  defaultValue={leadDriver?.lastName}
                  className={cls("driver0LastName")}
                />
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
                    <select
                      name={`driver_title_${row.id}`}
                      defaultValue={driverMeta.get(row.id)?.title || "Mr"}
                      className={inputClass}
                    >
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
                      defaultValue={driverMeta.get(row.id)?.firstName}
                      className={cls(`driver_firstName_${row.id}`)}
                    />
                  </Field>
                  <Field label="Last Name" required error={fieldErrors[`driver_lastName_${row.id}`]}>
                    <input
                      name={`driver_lastName_${row.id}`}
                      required
                      defaultValue={driverMeta.get(row.id)?.lastName}
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
            <input
              name="customerAddressStreet1"
              defaultValue={initialData.customerAddress.street1}
              className={inputClass}
            />
          </Field>
          <CityAutocomplete
            name="customerAddressCity"
            label="City"
            countryRef={customerCountryRef}
            stateRef={customerStateRef}
            defaultValue={initialData.customerAddress.city}
          />
          <Field label="State">
            <input
              ref={customerStateRef}
              name="customerAddressState"
              defaultValue={initialData.customerAddress.state}
              className={inputClass}
            />
          </Field>
          <CountryAutocomplete
            ref={customerCountryRef}
            name="customerAddressCountry"
            label="Country"
            defaultValue={{
              code: initialData.customerAddress.countryCode,
              name: initialData.customerAddress.countryName,
            }}
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">Pricing</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Gross is the selling price charged to the customer, Net is what the supplier charges us, and MCO is the margin.
        </p>
        <div className="mb-4 max-w-xs">
          <Field label="Currency" required>
            <select name="currency" required defaultValue={initialData.pricing.currency} className={inputClass}>
              {BOOKING_CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </Field>
        </div>

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
                    value={grossAmount}
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
                    value={netAmount}
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
            <textarea
              name="rateRemarks"
              rows={3}
              defaultValue={initialData.car.rateRemarks}
              className={inputClass}
            />
          </Field>
          <Field label="Special Request">
            <textarea
              name="specialRequest"
              rows={3}
              defaultValue={initialData.car.specialRequest}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <ConfirmSubmitButton
          confirmTitle="Save changes to this booking?"
          confirmMessage="This will update the booking's driver and car rental details."
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

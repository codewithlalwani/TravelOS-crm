"use client";

import { useEffect, useRef, useState } from "react";
import { ROOM_TYPE_OPTIONS, GUEST_TITLE_OPTIONS, CANCELLATION_POLICY_OPTIONS } from "@/lib/booking/hotelOptions";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import { IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { HotelSearchPanel, type HotelSelection, type HotelSearchInitial } from "./HotelSearchPanel";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

const STEPS = ["Search Hotels", "Guest Details", "Hotel Details", "Charges & Review"] as const;

interface GuestRow {
  id: number;
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inDate = new Date(`${checkIn}T00:00:00Z`);
  const outDate = new Date(`${checkOut}T00:00:00Z`);
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function NewHotelBookingWizard({
  action,
  initialHotelSearch,
}: {
  action: (formData: FormData) => void;
  initialHotelSearch?: HotelSearchInitial;
}) {
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);
  const hotelCountryRef = useRef<CountryAutocompleteHandle>(null);

  const [guestMode, setGuestMode] = useState<"myself" | "someone_else">("myself");
  const [gstEnabled, setGstEnabled] = useState(false);

  const nextGuestId = useRef(1);
  const [additionalGuestIds, setAdditionalGuestIds] = useState<GuestRow[]>([]);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [grossAmount, setGrossAmount] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const [selectedHotel, setSelectedHotel] = useState<HotelSelection | null>(null);

  interface PendingPrefill {
    hotelName: string;
    address: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }
  const [pendingPrefill, setPendingPrefill] = useState<PendingPrefill | null>(null);

  function handleHotelSelected(selection: HotelSelection) {
    setSelectedHotel(selection);
    setCheckIn(selection.checkIn);
    setCheckOut(selection.checkOut);
    setPendingPrefill({
      hotelName: selection.hotelName,
      address: selection.address,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      guests: selection.guests,
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

    setValue("hotelName", pendingPrefill.hotelName);
    setValue("address", pendingPrefill.address);
    setValue("checkIn", pendingPrefill.checkIn);
    setValue("checkOut", pendingPrefill.checkOut);
    setValue("guests", String(pendingPrefill.guests));

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

  function addGuest() {
    const id = nextGuestId.current++;
    setAdditionalGuestIds((rows) => [...rows, { id }]);
  }

  function removeGuest(id: number) {
    setAdditionalGuestIds((rows) => rows.filter((r) => r.id !== id));
  }

  const nights = nightsBetween(checkIn, checkOut);
  const mcoAmount = grossAmount - netAmount;

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-6">
      <input type="hidden" name="guestMode" value={guestMode} />
      <input type="hidden" name="gstEnabled" value={gstEnabled ? "1" : ""} />
      <input type="hidden" name="guestIds" value={additionalGuestIds.map((g) => g.id).join(",")} />

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

      {/* Step 0: Search Hotels */}
      <div data-step={0} hidden={step !== 0} className="space-y-6">
        <HotelSearchPanel onHotelSelected={handleHotelSelected} initial={initialHotelSearch} />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm font-medium text-secondary-foreground hover:underline"
          >
            Skip and enter hotel details manually →
          </button>
        </div>
      </div>

      {/* Step 1: Guest Details */}
      <div data-step={1} hidden={step !== 1} className="space-y-6">
        {selectedHotel && (
          <div className={sectionClass}>
            <h2 className="mb-2 font-heading text-base font-semibold text-card-foreground">Selected Hotel</h2>
            <p className="text-sm text-foreground">
              {selectedHotel.hotelName}
              {selectedHotel.address && <span className="text-muted-foreground"> — {selectedHotel.address}</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedHotel.checkIn} → {selectedHotel.checkOut}
            </p>
          </div>
        )}

        <div className={sectionClass}>
          <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">Guest Details</h2>
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                checked={guestMode === "myself"}
                onChange={() => setGuestMode("myself")}
                className="accent-primary"
              />
              Myself
            </label>
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="radio"
                checked={guestMode === "someone_else"}
                onChange={() => setGuestMode("someone_else")}
                className="accent-primary"
              />
              Someone Else
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <Field label="Title" className="lg:col-span-2">
              <select name="contactTitle" defaultValue="Mr" className={inputClass}>
                {GUEST_TITLE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="First Name" required className="lg:col-span-2">
              <input name="contactFirstName" required placeholder="First name" className={inputClass} />
            </Field>
            <Field label="Last Name" required className="lg:col-span-2">
              <input name="contactLastName" required placeholder="Last name" className={inputClass} />
            </Field>
            <Field label="Email Address" required className="lg:col-span-3">
              <input
                name="contactEmail"
                type="email"
                required
                placeholder="Booking voucher will be sent here"
                className={inputClass}
              />
            </Field>
            <Field label="Mobile Number" required className="lg:col-span-3">
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
                  className={inputClass}
                />
              </div>
            </Field>
          </div>

          {guestMode === "someone_else" && (
            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-card-foreground">Guest Staying</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Title">
                  <select name="guest0Title" defaultValue="Mr" className={inputClass}>
                    {GUEST_TITLE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="First Name" required>
                  <input name="guest0FirstName" required className={inputClass} />
                </Field>
                <Field label="Last Name" required>
                  <input name="guest0LastName" required className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={gstEnabled}
                onChange={(e) => setGstEnabled(e.target.checked)}
                className="accent-primary"
              />
              Enter GST Details <span className="text-muted-foreground">(Optional)</span>
            </label>
            {gstEnabled && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="GST Number">
                  <input name="gstNumber" className={inputClass} />
                </Field>
                <Field label="Company / Legal Name">
                  <input name="gstCompanyName" className={inputClass} />
                </Field>
              </div>
            )}
          </div>

          {additionalGuestIds.length > 0 && (
            <div className="mt-5 space-y-3">
              {additionalGuestIds.map((row, index) => (
                <div key={row.id} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-card-foreground">Guest {index + 2}</p>
                    <button
                      type="button"
                      onClick={() => removeGuest(row.id)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Title">
                      <select name={`guest_title_${row.id}`} defaultValue="Mr" className={inputClass}>
                        {GUEST_TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="First Name" required>
                      <input name={`guest_firstName_${row.id}`} required className={inputClass} />
                    </Field>
                    <Field label="Last Name" required>
                      <input name={`guest_lastName_${row.id}`} required className={inputClass} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addGuest}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Add Guest
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

      {/* Step 2: Hotel Details */}
      <div data-step={2} hidden={step !== 2} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Manage Hotel Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <Field label="Hotel Name" required>
              <input name="hotelName" required className={inputClass} />
            </Field>
            <Field label="Address" required>
              <input name="address" required className={inputClass} />
            </Field>
            {/* The hotel's own city/country, not the payer's — PayGlocal's risk engine scores the stay location. */}
            <CityAutocomplete
              name="city"
              label="Hotel City"
              required
              placeholder="City the hotel is in"
              countryRef={hotelCountryRef}
            />
            <CountryAutocomplete ref={hotelCountryRef} name="country" label="Hotel Country" />
            <Field label="Room Type" required>
              <select name="roomType" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select
                </option>
                {ROOM_TYPE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Check-in" required>
              <input
                name="checkIn"
                type="date"
                required
                value={checkIn}
                onChange={(e) => {
                  const value = e.target.value;
                  setCheckIn(value);
                  if (checkOut && value && checkOut <= value) setCheckOut("");
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Check-out" required>
              <input
                name="checkOut"
                type="date"
                required
                min={checkIn || undefined}
                disabled={!checkIn}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </Field>
            <Field label="Guests" required>
              <input name="guests" type="number" min={1} defaultValue={2} required className={inputClass} />
            </Field>
            <Field label="Confirmation No." required>
              <input name="confirmationNo" required className={inputClass} />
            </Field>
            <Field label="Hotel Rating">
              <input name="hotelRating" type="number" min={0} max={5} step="0.1" className={inputClass} />
            </Field>
            <Field label="Cancellation Policy">
              <select name="cancellationPolicy" defaultValue="" className={inputClass}>
                <option value="">Select</option>
                {CANCELLATION_POLICY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Special Request">
              <textarea name="specialRequest" rows={3} className={inputClass} />
            </Field>
          </div>
        </div>
      </div>

      {/* Step 3: Charges & Review */}
      <div data-step={3} hidden={step !== 3} className="space-y-6">
        <div className={sectionClass}>
          <h2 className="mb-1 font-heading text-base font-semibold text-card-foreground">Pricing</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Gross is the selling price charged to the customer, Net is what the supplier charges us, and MCO is the margin.
          </p>
          <div className="mb-4 max-w-xs">
            <Field label="Currency" required>
              <select name="currency" required defaultValue="USD" className={inputClass}>
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
                    Room Charges ({nights} night{nights === 1 ? "" : "s"})
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
                  <td className="truncate pt-3 text-right font-semibold text-primary">{mcoAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className="mb-3 font-heading text-base font-semibold text-card-foreground">Review</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Guests</dt>
              <dd className="font-medium text-foreground">{1 + additionalGuestIds.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nights</dt>
              <dd className="font-medium text-foreground">{nights}</dd>
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

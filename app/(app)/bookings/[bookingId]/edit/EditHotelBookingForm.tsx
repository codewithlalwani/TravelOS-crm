"use client";

import { useRef, useState } from "react";
import { ROOM_TYPE_OPTIONS, GUEST_TITLE_OPTIONS, CANCELLATION_POLICY_OPTIONS } from "@/lib/booking/hotelOptions";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";
import { IconPlus } from "@/components/icons";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { CountryAutocomplete, type CountryAutocompleteHandle } from "@/components/CountryAutocomplete";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { CityAutocomplete } from "@/components/CityAutocomplete";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-sm font-medium text-card-foreground";
const sectionClass = "rounded-2xl border border-border bg-card shadow-sm p-6";

export interface EditHotelBookingInitialData {
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
  gst: {
    enabled: boolean;
    number: string;
    companyName: string;
  };
  /** All guest passenger rows for this booking, in order; the first is the "guest staying" entry. */
  guests: Array<{ id: number; title: string; firstName: string; lastName: string }>;
  hotel: {
    hotelName: string;
    address: string;
    city: string;
    countryCode: string;
    countryName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    confirmationNo: string;
    hotelRating: string;
    cancellationPolicy: string;
    specialRequest: string;
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

export function EditHotelBookingForm({
  action,
  initialData,
}: {
  action: (formData: FormData) => void;
  initialData: EditHotelBookingInitialData;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const customerCountryRef = useRef<CountryAutocompleteHandle>(null);
  const customerStateRef = useRef<HTMLInputElement>(null);
  const hotelCountryRef = useRef<CountryAutocompleteHandle>(null);

  // The create wizard's "myself"/"someone else" toggle is a UI convenience only — nothing
  // persists it, so editing always shows the actual guest list ("someone else" mode) rather
  // than guessing which case applies from name matching.
  const [guestMode, setGuestMode] = useState<"myself" | "someone_else">("someone_else");
  const [gstEnabled, setGstEnabled] = useState(initialData.gst.enabled);

  const primaryGuest = initialData.guests[0];
  const extraGuests = initialData.guests.slice(1);

  const nextGuestId = useRef(extraGuests.reduce((max, g) => Math.max(max, g.id), 0) + 1);
  const [additionalGuestIds, setAdditionalGuestIds] = useState<Array<{ id: number }>>(
    extraGuests.map((g) => ({ id: g.id }))
  );
  const guestMeta = new Map(extraGuests.map((g) => [g.id, g]));

  const [checkIn, setCheckIn] = useState(initialData.hotel.checkIn);
  const [checkOut, setCheckOut] = useState(initialData.hotel.checkOut);
  const [grossAmount, setGrossAmount] = useState(initialData.pricing.grossAmount);
  const [netAmount, setNetAmount] = useState(initialData.pricing.netAmount);

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
      <input type="hidden" name="bookingId" value={initialData.bookingId} />
      <input type="hidden" name="guestMode" value={guestMode} />
      <input type="hidden" name="gstEnabled" value={gstEnabled ? "1" : ""} />
      <input type="hidden" name="guestIds" value={additionalGuestIds.map((g) => g.id).join(",")} />

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
            <select name="contactTitle" defaultValue={initialData.contact.title || "Mr"} className={inputClass}>
              {GUEST_TITLE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="First Name" required className="lg:col-span-2">
            <input
              name="contactFirstName"
              required
              defaultValue={initialData.contact.firstName}
              placeholder="First name"
              className={inputClass}
            />
          </Field>
          <Field label="Last Name" required className="lg:col-span-2">
            <input
              name="contactLastName"
              required
              defaultValue={initialData.contact.lastName}
              placeholder="Last name"
              className={inputClass}
            />
          </Field>
          <Field label="Email Address" required className="lg:col-span-3">
            <input
              name="contactEmail"
              type="email"
              required
              defaultValue={initialData.contact.email}
              placeholder="Booking voucher will be sent here"
              className={inputClass}
            />
          </Field>
          <Field label="Mobile Number" required className="lg:col-span-3">
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
                <select name="guest0Title" defaultValue={primaryGuest?.title || "Mr"} className={inputClass}>
                  {GUEST_TITLE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="First Name" required>
                <input name="guest0FirstName" required defaultValue={primaryGuest?.firstName} className={inputClass} />
              </Field>
              <Field label="Last Name" required>
                <input name="guest0LastName" required defaultValue={primaryGuest?.lastName} className={inputClass} />
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
                <input name="gstNumber" defaultValue={initialData.gst.number} className={inputClass} />
              </Field>
              <Field label="Company / Legal Name">
                <input name="gstCompanyName" defaultValue={initialData.gst.companyName} className={inputClass} />
              </Field>
            </div>
          )}
        </div>

        {additionalGuestIds.length > 0 && (
          <div className="mt-5 space-y-3">
            {additionalGuestIds.map((row, index) => {
              const meta = guestMeta.get(row.id);
              return (
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
                      <select name={`guest_title_${row.id}`} defaultValue={meta?.title || "Mr"} className={inputClass}>
                        {GUEST_TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="First Name" required>
                      <input name={`guest_firstName_${row.id}`} required defaultValue={meta?.firstName} className={inputClass} />
                    </Field>
                    <Field label="Last Name" required>
                      <input name={`guest_lastName_${row.id}`} required defaultValue={meta?.lastName} className={inputClass} />
                    </Field>
                  </div>
                </div>
              );
            })}
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
            <input name="customerAddressStreet1" defaultValue={initialData.customerAddress.street1} className={inputClass} />
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
            defaultValue={
              initialData.customerAddress.countryCode
                ? { code: initialData.customerAddress.countryCode, name: initialData.customerAddress.countryName }
                : undefined
            }
          />
        </div>
      </div>

      <div className={sectionClass}>
        <h2 className="mb-4 font-heading text-base font-semibold text-card-foreground">Manage Hotel Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Field label="Hotel Name" required>
            <input name="hotelName" required defaultValue={initialData.hotel.hotelName} className={inputClass} />
          </Field>
          <Field label="Address" required>
            <input name="address" required defaultValue={initialData.hotel.address} className={inputClass} />
          </Field>
          {/* The hotel's own city/country, not the payer's — PayGlocal's risk engine scores the stay location. */}
          <CityAutocomplete
            name="city"
            label="Hotel City"
            placeholder="City the hotel is in"
            countryRef={hotelCountryRef}
            defaultValue={initialData.hotel.city}
          />
          <CountryAutocomplete
            ref={hotelCountryRef}
            name="country"
            label="Hotel Country"
            defaultValue={
              initialData.hotel.countryCode
                ? { code: initialData.hotel.countryCode, name: initialData.hotel.countryName }
                : undefined
            }
          />
          <Field label="Room Type" required>
            <select name="roomType" required defaultValue={initialData.hotel.roomType || ""} className={inputClass}>
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
            <input name="guests" type="number" min={1} defaultValue={initialData.hotel.guests} required className={inputClass} />
          </Field>
          <Field label="Confirmation No." required>
            <input name="confirmationNo" required defaultValue={initialData.hotel.confirmationNo} className={inputClass} />
          </Field>
          <Field label="Hotel Rating">
            <input
              name="hotelRating"
              type="number"
              min={0}
              max={5}
              step="0.1"
              defaultValue={initialData.hotel.hotelRating}
              className={inputClass}
            />
          </Field>
          <Field label="Cancellation Policy">
            <select
              name="cancellationPolicy"
              defaultValue={initialData.hotel.cancellationPolicy}
              className={inputClass}
            >
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
            <textarea name="specialRequest" rows={3} defaultValue={initialData.hotel.specialRequest} className={inputClass} />
          </Field>
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
                <td className="truncate pt-3 text-right font-semibold text-primary">{mcoAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <ConfirmSubmitButton
          confirmTitle="Save changes to this booking?"
          confirmMessage="This will update the booking's guest and hotel details."
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

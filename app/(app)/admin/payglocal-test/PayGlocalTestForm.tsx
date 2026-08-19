"use client";

import { useActionState, useState } from "react";
import { testPayGlocalPaymentAction, initialPayGlocalTestState } from "./actions";

const ONE_WAY_SAMPLE = {
  bookingRef: "TESTOW",
  amount: 101,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "flight",
    tripType: "One Way",
    reservationDate: "2025-12-01",
    pnr: "ticket12345",
    destination: "BLR",
    legs: [
      {
        flightNumber: "flight123",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2023-03-20",
        depTime: "09:01",
        arrAirport: "BLR",
        arrCity: "Bangalore",
        arrCountry: "IN",
        arrDate: "2023-03-21",
        arrTime: "09:01",
        cabinClass: "ECONOMY",
      },
    ],
    passengers: [{ firstName: "Sam", lastName: "Thomas" }],
  },
};

const RETURN_SAMPLE = {
  bookingRef: "TESTRT",
  amount: 2902,
  currency: "INR",
  customerName: "Roy Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "flight",
    tripType: "Round Trip",
    reservationDate: "2025-06-01",
    pnr: "ticket56789",
    destination: "BLR",
    legs: [
      {
        flightNumber: "NY123",
        airline: "AAL",
        depAirport: "JFK",
        depCity: "New York",
        depCountry: "US",
        depDate: "2024-06-10",
        depTime: "08:00",
        arrAirport: "AUH",
        arrCity: "Abu Dhabi",
        arrCountry: "AE",
        arrDate: "2024-06-10",
        arrTime: "20:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "AUH456",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2024-06-11",
        depTime: "02:00",
        arrAirport: "BLR",
        arrCity: "Bangalore",
        arrCountry: "IN",
        arrDate: "2024-06-11",
        arrTime: "08:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "BLR789",
        airline: "AAL",
        depAirport: "BLR",
        depCity: "Bangalore",
        depCountry: "IN",
        depDate: "2024-06-20",
        depTime: "10:00",
        arrAirport: "AUH",
        arrCity: "Abu Dhabi",
        arrCountry: "AE",
        arrDate: "2024-06-20",
        arrTime: "16:00",
        cabinClass: "ECONOMY",
      },
      {
        flightNumber: "AUH321",
        airline: "AAL",
        depAirport: "AUH",
        depCity: "Abu Dhabi",
        depCountry: "AE",
        depDate: "2024-06-21",
        depTime: "00:00",
        arrAirport: "JFK",
        arrCity: "New York",
        arrCountry: "US",
        arrDate: "2024-06-21",
        arrTime: "10:00",
        cabinClass: "ECONOMY",
      },
    ],
    passengers: [
      { firstName: "Sam", lastName: "Thomas" },
      { firstName: "John", lastName: "Denver" },
    ],
  },
};

const HOTEL_SAMPLE = {
  bookingRef: "TESTHT",
  amount: 12000,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "hotel",
    lodgingName: "Lake View",
    checkInDate: "2025-01-04",
    checkOutDate: "2025-01-06",
    city: "Mumbai",
    country: "IN",
    rating: "4.0",
    cancellationPolicy: "NC",
  },
};

const CAR_SAMPLE = {
  bookingRef: "TESTCR",
  amount: 117800,
  currency: "INR",
  customerName: "Sam Thomas",
  customerEmail: "sam.thomas@gmail.com",
  billingAddress: {
    street1: "Apartment 9B, 235 East, 43rd Street",
    city: "New York",
    state: "New York",
    country: "US",
  },
  travel: {
    type: "car",
    pickupDateTime: "2023-03-20T09:01:56Z",
    passengers: [{ firstName: "Sam", lastName: "Thomas" }],
  },
};

function sampleJson(sample: unknown): string {
  return JSON.stringify(sample, null, 2);
}

export function PayGlocalTestForm({ mode }: { mode: "mock" | "live" }) {
  const [state, formAction, isPending] = useActionState(testPayGlocalPaymentAction, initialPayGlocalTestState);
  const [payload, setPayload] = useState(() => sampleJson(ONE_WAY_SAMPLE));

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          mode === "live" ? "border-warning/40 bg-warning-bg text-warning" : "border-border bg-muted text-muted-foreground"
        }`}
      >
        {mode === "live"
          ? "PAYGLOCAL_MODE=live — submitting here calls the real PayGlocal UAT/prod API and creates a real gid. No booking record is created."
          : "PAYGLOCAL_MODE=mock — submitting here only returns a fake local link, not a real PayGlocal call."}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPayload(sampleJson(ONE_WAY_SAMPLE))}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Load One Way sample
        </button>
        <button
          type="button"
          onClick={() => setPayload(sampleJson(RETURN_SAMPLE))}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Load Round Trip sample
        </button>
        <button
          type="button"
          onClick={() => setPayload(sampleJson(HOTEL_SAMPLE))}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Load Hotel sample
        </button>
        <button
          type="button"
          onClick={() => setPayload(sampleJson(CAR_SAMPLE))}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Load Car sample
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <textarea
          name="payload"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-card p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send to PayGlocal"}
        </button>
      </form>

      {state.status === "success" && state.result && (
        <div className="space-y-1 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
          <p className="font-medium text-success">Success</p>
          <p className="text-foreground">
            gid: <span className="font-mono">{state.result.gatewayLinkId}</span>
          </p>
          <p className="break-all text-foreground">
            Pay link:{" "}
            <a href={state.result.linkUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              {state.result.linkUrl}
            </a>
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <p className="font-medium">Failed</p>
          <p className="break-all">{state.message}</p>
        </div>
      )}
    </div>
  );
}

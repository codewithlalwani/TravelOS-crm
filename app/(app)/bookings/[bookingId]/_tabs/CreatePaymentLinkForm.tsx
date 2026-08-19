"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BOOKING_CURRENCY_OPTIONS } from "@/lib/booking/currencyOptions";

/** Client-side counterpart to the old server action: submits straight to
 * POST /api/payments/create-link so the short URL comes back over the same
 * REST contract external callers use, then refreshes the page to show it. */
export function CreatePaymentLinkForm({ bookingId, authorized }: { bookingId: number; authorized: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount: Number(amount), currency }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not create payment link");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create payment link");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setConfirmOpen(true);
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-card-foreground">Amount</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-card-foreground">Currency</label>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {BOOKING_CURRENCY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!authorized || pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Payment Link"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Create payment link?"
        message="This will generate a PayGlocal payment link and submit booking, customer, passenger and travel data to PayGlocal's Risk Engine."
        confirmLabel="Create Link"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCreate}
      />
    </>
  );
}

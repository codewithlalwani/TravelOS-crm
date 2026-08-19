"use client";

import { useRef, useState } from "react";
import { IconPlus } from "@/components/icons";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "mb-1 block text-xs font-medium text-card-foreground";

interface ChargeRow {
  id: number;
}

export function ChargeAuthorizationFields({
  defaultAmount,
  defaultCustomerName,
  currency,
  today,
  defaultDate,
  defaultRefundAmount,
  defaultCharges,
}: {
  defaultAmount: number;
  defaultCustomerName: string;
  currency: string;
  today: string;
  defaultDate?: string;
  defaultRefundAmount?: number;
  defaultCharges?: Array<{ label: string; amount: number }>;
}) {
  const nextId = useRef(defaultCharges?.length || 1);
  const [charges, setCharges] = useState<ChargeRow[]>(
    defaultCharges?.length ? defaultCharges.map((_, i) => ({ id: i })) : [{ id: 0 }]
  );

  function addCharge() {
    const id = nextId.current++;
    setCharges((rows) => [...rows, { id }]);
  }

  function removeCharge(id: number) {
    setCharges((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="chargeIds" value={charges.map((c) => c.id).join(",")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Total authorized amount ({currency})</label>
          <input
            name="authorizedAmount"
            required
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultAmount.toFixed(2)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Authorization date</label>
          <input name="authorizationDate" required type="date" defaultValue={defaultDate || today} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Customer e-signature (typed name)</label>
          <input name="eSignatureName" required defaultValue={defaultCustomerName} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Refund amount ({currency}, optional)</label>
          <input
            name="refundAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultRefundAmount != null ? defaultRefundAmount.toFixed(2) : undefined}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Charges details</label>
        <div className="space-y-2">
          {charges.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                name={`charge_label_${row.id}`}
                required
                placeholder={index === 0 ? "e.g. Icelandair" : "e.g. Air Travel Charges"}
                defaultValue={defaultCharges?.[index]?.label}
                className={inputClass}
              />
              <input
                name={`charge_amount_${row.id}`}
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                defaultValue={defaultCharges?.[index] ? defaultCharges[index].amount.toFixed(2) : undefined}
                className={inputClass + " max-w-[140px]"}
              />
              {charges.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCharge(row.id)}
                  className="shrink-0 text-xs font-medium text-danger hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCharge}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-secondary/40 px-2 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/10"
        >
          <IconPlus className="h-3 w-3" />
          Add charge
        </button>
      </div>
    </div>
  );
}

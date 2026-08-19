"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";
import type { InvoiceLineItem } from "@/models/Invoice";

type Row = { description: string; quantity: string; rate: string };

function initialRows(lineItems: InvoiceLineItem[] | null, amount: string): Row[] {
  if (lineItems && lineItems.length > 0) {
    return lineItems.map((li) => ({ description: li.description, quantity: String(li.quantity), rate: String(li.rate) }));
  }
  return [{ description: "Invoice Total", quantity: "1", rate: amount }];
}

/** Drop-in replacement for a `<button type="submit">` inside a `<form action={...}>` that
 * gates the submission behind a dialog where the invoice's line items and currency can be edited
 * before the invoice PDF is regenerated. */
export function EditInvoiceButton({
  invoiceNo,
  currency,
  amount,
  lineItems,
  children,
  disabled,
  className,
}: {
  invoiceNo: string;
  currency: string;
  amount: string;
  lineItems: InvoiceLineItem[] | null;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => initialRows(lineItems, amount));
  const [curr, setCurr] = useState(currency);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openDialog() {
    setRows(initialRows(lineItems, amount));
    setCurr(currency);
    setOpen(true);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((prev) => [...prev, { description: "", quantity: "1", rate: "0" }]);
  }

  const parsedRows = rows.map((r) => ({
    description: r.description.trim(),
    quantity: Number(r.quantity),
    rate: Number(r.rate),
  }));
  const validRows = parsedRows.filter((r) => r.description.length > 0);
  const hasInvalidRow = validRows.some(
    (r) => !Number.isFinite(r.quantity) || r.quantity <= 0 || !Number.isFinite(r.rate) || r.rate < 0
  );
  const total = validRows.reduce((sum, r) => sum + r.quantity * r.rate, 0);
  const validCurrency = /^[A-Za-z]{3}$/.test(curr.trim());
  const canSave = validRows.length > 0 && !hasInvalidRow && validCurrency;

  return (
    <>
      <button
        type="submit"
        ref={buttonRef}
        disabled={disabled || pending}
        onClick={(e) => {
          e.preventDefault();
          openDialog();
        }}
        className={className}
      >
        {pending ? "Saving…" : children}
      </button>
      <ConfirmDialog
        open={open}
        wide
        title={`Edit invoice ${invoiceNo}`}
        message="Update the line items and currency, then save to regenerate the invoice PDF."
        confirmLabel="Save changes"
        cancelLabel="Cancel"
        confirmDisabled={!canSave}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (!canSave) return;
          setOpen(false);
          buttonRef.current?.form?.requestSubmit(buttonRef.current);
        }}
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-card-foreground">Currency</label>
            <input
              type="text"
              value={curr}
              onChange={(e) => setCurr(e.target.value.toUpperCase())}
              maxLength={3}
              className={`w-24 rounded-xl border bg-background px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary ${
                validCurrency ? "border-border" : "border-danger"
              }`}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-card-foreground">Line items</p>
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(i, "description", e.target.value)}
                  placeholder="Description"
                  className="min-w-[10rem] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.rate}
                  onChange={(e) => updateRow(i, "rate", e.target.value)}
                  placeholder="Rate"
                  className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    aria-label="Remove line item"
                    className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Add line item
            </button>
          </div>

          {hasInvalidRow && (
            <p className="text-xs text-danger">Every line item needs a quantity greater than 0 and a non-negative rate.</p>
          )}
          <p className="text-sm font-semibold text-card-foreground">
            Total: {curr.trim().toUpperCase() || currency} {total.toFixed(2)}
          </p>
        </div>

        <input type="hidden" name="currency" value={curr.trim().toUpperCase()} />
        {validRows.map((r, i) => (
          <span key={i}>
            <input type="hidden" name="lineItemDescription" value={r.description} />
            <input type="hidden" name="lineItemQuantity" value={r.quantity} />
            <input type="hidden" name="lineItemRate" value={r.rate} />
          </span>
        ))}
      </ConfirmDialog>
    </>
  );
}

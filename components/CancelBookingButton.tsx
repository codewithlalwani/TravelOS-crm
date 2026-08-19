"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconX } from "./icons";

/** Submit button for a `<form action={cancelBookingAction}>` that gates cancellation behind a
 * confirmation dialog capturing a required cancellation reason (posted as the "reason" field).
 * `compact` drops the button chrome down to a plain link so it sits inside a list row. */
export function CancelBookingButton({ bookingRef, compact }: { bookingRef: string; compact?: boolean }) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        disabled={pending}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            : "inline-flex items-center gap-1.5 rounded-xl border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <IconX className="h-3.5 w-3.5" />
        {pending ? "Cancelling…" : compact ? "Cancel" : "Cancel Booking"}
      </button>
      <input type="hidden" name="reason" value={reason} readOnly />
      <ConfirmDialog
        open={open}
        title="Cancel this booking?"
        message={`This will mark booking ${bookingRef} as cancelled and cannot be undone.`}
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        danger
        wide
        confirmDisabled={reason.trim().length === 0}
        onCancel={() => {
          setOpen(false);
          setReason("");
        }}
        onConfirm={() => {
          setOpen(false);
          buttonRef.current?.form?.requestSubmit();
        }}
      >
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-card-foreground">
            Reason for cancellation<span className="text-danger">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. Customer requested cancellation due to change of travel plans"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";

type ConfirmSubmitButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick"
> & {
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  danger?: boolean;
};

/** Drop-in replacement for a `<button type="submit">` inside a `<form action={...}>` that
 * gates the real submission behind a confirmation dialog. */
export function ConfirmSubmitButton({
  confirmTitle,
  confirmMessage,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel,
  danger,
  children,
  disabled,
  ...buttonProps
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        {...buttonProps}
        ref={buttonRef}
        type="submit"
        disabled={disabled || pending}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {pending ? pendingLabel ?? children : children}
      </button>
      <ConfirmDialog
        open={open}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        danger={danger}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          buttonRef.current?.form?.requestSubmit(buttonRef.current);
        }}
      />
    </>
  );
}

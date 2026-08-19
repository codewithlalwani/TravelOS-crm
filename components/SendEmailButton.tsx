"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";

type SendEmailButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> & {
  confirmTitle: string;
  confirmMessage: string;
  defaultRecipients: string[];
  recipientsFieldName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  danger?: boolean;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Drop-in replacement for a `<button type="submit">` inside a `<form action={...}>` that
 * gates the submission behind a confirmation dialog where the recipient list can be edited —
 * existing addresses can be changed or removed, and new ones added, before the email is sent. */
export function SendEmailButton({
  confirmTitle,
  confirmMessage,
  defaultRecipients,
  recipientsFieldName = "recipients",
  confirmLabel = "Send",
  cancelLabel = "Cancel",
  pendingLabel,
  danger,
  children,
  disabled,
  ...buttonProps
}: SendEmailButtonProps) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<string[]>(defaultRecipients.length ? defaultRecipients : [""]);
  const [newEmail, setNewEmail] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openDialog() {
    setEmails(defaultRecipients.length ? defaultRecipients : [""]);
    setNewEmail("");
    setOpen(true);
  }

  function updateEmail(index: number, value: string) {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  }

  function removeEmail(index: number) {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  }

  function addEmail() {
    const value = newEmail.trim();
    if (!value) return;
    setEmails((prev) => [...prev, value]);
    setNewEmail("");
  }

  const cleanedEmails = emails.map((e) => e.trim()).filter(Boolean);
  const hasInvalid = cleanedEmails.some((e) => !isValidEmail(e));
  const canSend = cleanedEmails.length > 0 && !hasInvalid;

  return (
    <>
      <button
        {...buttonProps}
        ref={buttonRef}
        type="submit"
        disabled={disabled || pending}
        onClick={(e) => {
          e.preventDefault();
          openDialog();
        }}
      >
        {pending ? pendingLabel ?? children : children}
      </button>
      <ConfirmDialog
        open={open}
        wide
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        danger={danger}
        confirmDisabled={!canSend}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          if (!canSend) return;
          setOpen(false);
          buttonRef.current?.form?.requestSubmit(buttonRef.current);
        }}
      >
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-card-foreground">Recipients</p>
          {emails.map((email, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => updateEmail(i, e.target.value)}
                placeholder="name@example.com"
                className={`w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                  email.trim() && !isValidEmail(email) ? "border-danger" : "border-border"
                }`}
              />
              {emails.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmail(i)}
                  aria-label="Remove recipient"
                  className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
              placeholder="Add another email…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={addEmail}
              disabled={!newEmail.trim()}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {hasInvalid && <p className="text-xs text-danger">Please enter valid email addresses, or remove the incomplete one.</p>}
        </div>
        {cleanedEmails.map((email, i) => (
          <input key={i} type="hidden" name={recipientsFieldName} value={email} />
        ))}
      </ConfirmDialog>
    </>
  );
}

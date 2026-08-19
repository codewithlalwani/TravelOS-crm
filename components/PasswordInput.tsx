"use client";

import { useState, type ReactNode } from "react";
import { IconEye, IconEyeOff } from "./icons";

const defaultInputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export default function PasswordInput({
  id,
  name,
  placeholder,
  className,
  leadingIcon,
  toggleClassName,
  autoComplete,
  describedBy,
}: {
  id: string;
  name: string;
  placeholder?: string;
  /** Replaces the default input styling when the surrounding screen has its own theme. */
  className?: string;
  /** Rendered inside the field, before the text. Pad `className` accordingly. */
  leadingIcon?: ReactNode;
  toggleClassName?: string;
  autoComplete?: "current-password" | "new-password";
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          {leadingIcon}
        </span>
      )}
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        placeholder={placeholder}
        className={className || defaultInputClass}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={
          toggleClassName ||
          "absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        }
      >
        {visible ? <IconEyeOff className="h-4.5 w-4.5" /> : <IconEye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}

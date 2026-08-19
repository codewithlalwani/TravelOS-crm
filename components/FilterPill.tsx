"use client";

import { IconChevronDown } from "@/components/icons";

export function FilterPill({
  label,
  active,
  open,
  onToggle,
  children,
  align = "left",
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-card-foreground hover:bg-secondary/10"
        }`}
      >
        {label}
        <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div
            className={`absolute z-20 mt-2 w-72 rounded-xl border border-border bg-card p-4 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

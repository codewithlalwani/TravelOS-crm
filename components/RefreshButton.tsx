"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "./icons";

/** Re-fetches the current server component's data in place (e.g. to pick up a payment webhook that just landed). */
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function handleClick() {
    startTransition(() => {
      router.refresh();
    });
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      <IconRefresh className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
      {justRefreshed && !isPending ? "Refreshed" : "Refresh"}
    </button>
  );
}

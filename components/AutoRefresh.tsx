"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current server component's data in place while `enabled`, so payment status changes
 * from PayGlocal's async webhook (which arrives out-of-band, not from this browser tab) show up
 * without the user having to manually hit Refresh.
 */
export function AutoRefresh({ enabled, intervalMs = 8000 }: { enabled: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, router]);

  return null;
}

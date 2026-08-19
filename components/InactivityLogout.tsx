"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logoutForInactivity } from "@/app/(app)/actions";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 1_000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
];

export function InactivityLogout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const loggingOut = useRef(false);

  useEffect(() => {
    const storageKey = `fc-last-activity:${sessionId}`;
    let lastActivity = Date.now();
    let lastStoredActivity = 0;
    let timeoutId: number | undefined;

    const storedActivity = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(storedActivity) && storedActivity > 0) {
      lastActivity = storedActivity;
    } else {
      window.localStorage.setItem(storageKey, String(lastActivity));
    }

    const performLogout = () => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      window.localStorage.removeItem(storageKey);
      void logoutForInactivity().catch(() => {
        // A navigation to a protected page gives the server another chance to
        // enforce the session if the action request was interrupted.
        router.replace("/login");
      });
    };

    const scheduleLogout = () => {
      window.clearTimeout(timeoutId);
      const remaining = INACTIVITY_LIMIT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) {
        performLogout();
        return;
      }
      timeoutId = window.setTimeout(performLogout, remaining);
    };

    const recordActivity = () => {
      if (loggingOut.current) return;

      const now = Date.now();
      // Do not let the first event after a long-sleeping tab revive an expired session.
      if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
        performLogout();
        return;
      }

      lastActivity = now;
      if (now - lastStoredActivity >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastStoredActivity = now;
        window.localStorage.setItem(storageKey, String(now));
      }
      scheduleLogout();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const activity = Number(event.newValue);
      if (Number.isFinite(activity) && activity > lastActivity) {
        lastActivity = activity;
        scheduleLogout();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleLogout();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleLogout();

    return () => {
      window.clearTimeout(timeoutId);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, recordActivity);
      }
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, sessionId]);

  return null;
}

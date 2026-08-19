"use client";

import { useEffect } from "react";

export function ClientBootEffects() {
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const dark = storedTheme
        ? storedTheme === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
      window.dispatchEvent(new Event("themechange"));
    } catch {
      // Keep the server-rendered light theme when browser storage is unavailable.
    }

    const preventNumberWheelChange = () => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement && activeElement.type === "number") {
        activeElement.blur();
      }
    };
    document.addEventListener("wheel", preventNumberWheelChange, { passive: true });
    return () => document.removeEventListener("wheel", preventNumberWheelChange);
  }, []);

  return null;
}

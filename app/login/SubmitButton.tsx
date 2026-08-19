"use client";

import { useState, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

export default function SubmitButton() {
  const { pending } = useFormStatus();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  function submitWithLocation(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || locating || pending) return;

    if (!navigator.geolocation) {
      setLocationError("Location is unavailable in this browser. Admin accounts may continue without it.");
      form.requestSubmit();
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        (form.elements.namedItem("latitude") as HTMLInputElement).value = String(position.coords.latitude);
        (form.elements.namedItem("longitude") as HTMLInputElement).value = String(position.coords.longitude);
        (form.elements.namedItem("locationAccuracy") as HTMLInputElement).value = String(position.coords.accuracy);
        setLocating(false);
        form.requestSubmit();
      },
      () => {
        setLocating(false);
        setLocationError("Location permission was not granted. Agent and manager accounts require it to sign in.");
        form.requestSubmit();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <>
    <button
      type="button"
      disabled={pending || locating}
      onClick={submitWithLocation}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#397cff] via-[#3b56f3] to-[#7540df] text-base font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {(pending || locating) && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {locating ? "Checking location…" : pending ? "Signing in…" : "Sign In"}
    </button>
    {locationError && <p className="mt-2 text-center text-xs text-amber-300">{locationError}</p>}
    <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
    </>
  );
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import countryCodes from "@/app/utils/country-code.json";

interface CountryCode {
  name: string;
  dial_code: string;
  code: string;
}

const ALL_COUNTRIES = countryCodes as CountryCode[];

// GET /api/country-codes?q=ind — searches by country name, ISO code, or dial code.
// Kept server-side so the ~250-entry JSON never ships in the client bundle;
// shared across the Flight, Car, and Hotel booking wizards.
export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("q") || "").trim().toLowerCase();
  if (!query) {
    return NextResponse.json({ suggestions: ALL_COUNTRIES.slice(0, 8) });
  }

  const normalizedDial = query.replace(/\s+/g, "");
  const suggestions = ALL_COUNTRIES.filter((c) => {
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase() === query ||
      c.dial_code.replace(/\s+/g, "").includes(normalizedDial)
    );
  }).slice(0, 20);

  return NextResponse.json({ suggestions });
}

import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { getFlightSearchAdapter } from "@/lib/flights";
import type { StopsFilter } from "@/lib/flights";
import { CABIN_CLASS_OPTIONS, type CabinClass, type TripType } from "@/lib/booking/flightOptions";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!session || !can(perms, "flights.create")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const departureId = (searchParams.get("departureId") || "").trim().toUpperCase();
  const arrivalId = (searchParams.get("arrivalId") || "").trim().toUpperCase();
  const outboundDate = searchParams.get("outboundDate") || "";
  const returnDate = searchParams.get("returnDate") || undefined;
  const tripTypeParam = searchParams.get("tripType");
  const tripType: TripType = tripTypeParam === "One Way" || tripTypeParam === "Multi City" ? tripTypeParam : "Round Trip";
  let multiCityLegs: Array<{ departureId: string; arrivalId: string; date: string }> | undefined;
  if (tripType === "Multi City") {
    try {
      const parsed = JSON.parse(searchParams.get("multiCityLegs") || "[]") as unknown;
      if (Array.isArray(parsed)) {
        multiCityLegs = parsed.map((leg) => {
          const value = leg as Record<string, unknown>;
          return {
            departureId: String(value.departureId || "").trim().toUpperCase(),
            arrivalId: String(value.arrivalId || "").trim().toUpperCase(),
            date: String(value.date || ""),
          };
        });
      }
    } catch {
      multiCityLegs = undefined;
    }
  }
  const cabinClassParam = searchParams.get("cabinClass") || "Economy";
  const cabinClass: CabinClass = (CABIN_CLASS_OPTIONS as string[]).includes(cabinClassParam)
    ? (cabinClassParam as CabinClass)
    : "Economy";
  const adults = Math.min(9, Math.max(1, Number(searchParams.get("adults")) || 1));
  const children = Math.min(8, Math.max(0, Number(searchParams.get("children")) || 0));
  const departureToken = searchParams.get("departureToken") || undefined;

  const stopsParam = searchParams.get("stops");
  const stops: StopsFilter = stopsParam === "nonstop" || stopsParam === "1stop" ? stopsParam : "any";
  const includeAirlines = (searchParams.get("includeAirlines") || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  const bags = Math.min(9, Math.max(0, Number(searchParams.get("bags")) || 0));
  const maxPriceParam = Number(searchParams.get("maxPrice"));
  const maxPrice = Number.isFinite(maxPriceParam) && maxPriceParam > 0 ? maxPriceParam : undefined;
  const times = searchParams.get("times") || undefined;
  const emissions = searchParams.get("emissions") === "1";
  const excludeConns = (searchParams.get("excludeConns") || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  const maxDurationParam = Number(searchParams.get("maxDuration"));
  const maxDuration = Number.isFinite(maxDurationParam) && maxDurationParam > 0 ? maxDurationParam : undefined;

  if (!departureId || !arrivalId || !outboundDate) {
    return NextResponse.json({ error: "departureId, arrivalId and outboundDate are required" }, { status: 400 });
  }
  if (tripType === "Round Trip" && !returnDate) {
    return NextResponse.json({ error: "returnDate is required for round trips" }, { status: 400 });
  }
  if (tripType === "Multi City" && (!multiCityLegs || multiCityLegs.length < 2 || multiCityLegs.some((leg) => !leg.departureId || !leg.arrivalId || !leg.date))) {
    return NextResponse.json({ error: "At least two complete multicity flights are required" }, { status: 400 });
  }

  try {
    const result = await getFlightSearchAdapter().searchFlights({
      departureId,
      arrivalId,
      outboundDate,
      returnDate,
      tripType,
      cabinClass,
      adults,
      children,
      infantsInSeat: 0,
      infantsOnLap: 0,
      currency: "USD",
      departureToken,
      multiCityLegs,
      stops,
      includeAirlines: includeAirlines.length ? includeAirlines : undefined,
      bags: bags || undefined,
      maxPrice,
      outboundTimes: times,
      returnTimes: times,
      emissions: emissions || undefined,
      excludeConns: excludeConns.length ? excludeConns : undefined,
      maxDuration,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Flight search failed" },
      { status: 502 }
    );
  }
}

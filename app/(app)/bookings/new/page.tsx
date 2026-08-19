import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import type { CabinClass, TripType } from "@/lib/booking/flightOptions";
import type { FlightSearchInitial } from "./FlightSearchPanel";
import { createFlightBookingAction } from "../actions";
import { NewBookingWizard } from "./NewBookingWizard";

export default async function NewFlightBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    originCode?: string;
    originName?: string;
    originCity?: string;
    originCountry?: string;
    destCode?: string;
    destName?: string;
    destCity?: string;
    destCountry?: string;
    tripType?: string;
    cabinClass?: string;
    departDate?: string;
    returnDate?: string;
    travelers?: string;
    autoSearch?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "flights.create")) redirect(defaultPathFor(perms));

  const params = await searchParams;
  const { error } = params;

  const initialFlightSearch: FlightSearchInitial | undefined = params.originCode
    ? {
        tripType: params.tripType === "One Way" || params.tripType === "Multi City" ? params.tripType : ("Round Trip" as TripType),
        cabinClass: (params.cabinClass as CabinClass) || "Economy",
        from: {
          code: params.originCode,
          name: params.originName || params.originCode,
          city: params.originCity || null,
          country: params.originCountry || null,
        },
        to: params.destCode
          ? {
              code: params.destCode,
              name: params.destName || params.destCode,
              city: params.destCity || null,
              country: params.destCountry || null,
            }
          : null,
        departDate: params.departDate || "",
        returnDate: params.returnDate || "",
        travelers: params.travelers ? Number(params.travelers) : 1,
        autoSearch: params.autoSearch === "1",
      }
    : undefined;

  return (
    <div className="max-w-[1600px]">
      <Link href="/bookings/flights" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Flight Bookings
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New Flight Booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This assumes the customer has already agreed to purchase — record the confirmed flight so the
        authorization, payment, ticketing and invoicing workflow can begin.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <NewBookingWizard action={createFlightBookingAction} initialFlightSearch={initialFlightSearch} />
    </div>
  );
}

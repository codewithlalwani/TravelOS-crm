import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import type { HotelSearchInitial } from "../HotelSearchPanel";
import { createHotelBookingAction } from "../../actions";
import { NewHotelBookingWizard } from "../NewHotelBookingWizard";

export default async function NewHotelBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    location?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    autoSearch?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "hotels.create")) redirect(defaultPathFor(perms));

  const params = await searchParams;
  const { error } = params;

  const initialHotelSearch: HotelSearchInitial | undefined = params.location
    ? {
        location: params.location,
        checkInDate: params.checkIn || "",
        checkOutDate: params.checkOut || "",
        adults: params.adults ? Number(params.adults) : 2,
        children: params.children ? Number(params.children) : 0,
        autoSearch: params.autoSearch === "1",
      }
    : undefined;

  return (
    <div className="max-w-[1600px]">
      <Link href="/bookings/hotels" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Hotel Bookings
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New Hotel Booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This assumes the customer has already agreed to purchase — record the confirmed hotel stay so the
        authorization, payment, ticketing and invoicing workflow can begin.
      </p>

      {error && <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <NewHotelBookingWizard action={createHotelBookingAction} initialHotelSearch={initialHotelSearch} />
    </div>
  );
}

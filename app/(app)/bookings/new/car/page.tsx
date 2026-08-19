import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { createCarBookingAction } from "../../actions";
import { NewCarBookingWizard } from "../NewCarBookingWizard";

export default async function NewCarBookingPage() {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "cars.create")) redirect(defaultPathFor(perms));

  return (
    <div className="max-w-[1600px]">
      <Link href="/bookings/cars" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Car Bookings
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">New Car Booking</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This assumes the customer has already agreed to purchase — record the confirmed car rental so the
        authorization, payment, ticketing and invoicing workflow can begin.
      </p>

      <NewCarBookingWizard action={createCarBookingAction} />
    </div>
  );
}

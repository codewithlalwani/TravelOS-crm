import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { PayGlocalTestForm } from "./PayGlocalTestForm";

export default async function PayGlocalTestPage() {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "bookings.payment")) redirect(defaultPathFor(perms));

  const mode = process.env.PAYGLOCAL_MODE === "live" ? "live" : "mock";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">PayGlocal Payment Link Test</h1>
        <p className="text-sm text-muted-foreground">
          Send a sample payment-initiate payload straight to PayGlocal and inspect the pay link or error it returns —
          no booking record is created.
        </p>
      </div>
      <PayGlocalTestForm mode={mode} />
    </div>
  );
}

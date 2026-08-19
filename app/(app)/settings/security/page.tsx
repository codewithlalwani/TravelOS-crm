import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { findUserById } from "@/services/userService";
import { IconShieldCheck } from "@/components/icons";
import { updateTwoFactorSetting } from "./actions";

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  const [user, params] = await Promise.all([findUserById(session.userId), searchParams]);
  if (!user?.isActive) redirect("/login");

  const isAgent = user.roleRecord?.key === "agent";
  const enabled = user.twoFactorEnabled;
  const saved = params.saved === "enabled" || params.saved === "disabled";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Security settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage sign-in protection for your account.</p>
      </div>

      {saved && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Two-factor authentication has been {params.saved}.
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <IconShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-card-foreground">Email sign-in verification</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isAgent || enabled ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                {isAgent ? "Managed" : enabled ? "Enabled" : "Off"}
              </span>
            </div>
            {isAgent ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign-in verification is managed by <strong className="text-foreground">{user.creator?.name ?? "your reporting manager"}</strong>. After your password is accepted, the verification code is sent to your manager&apos;s email for approval.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  When enabled, a single-use 6-digit verification code will be sent to <strong className="text-foreground">{user.email}</strong> after your password is accepted.
                </p>
                <form action={updateTwoFactorSetting} className="mt-5">
                  <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                  <button type="submit" className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${enabled ? "border border-border bg-background text-foreground hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                    {enabled ? "Turn off 2FA" : "Enable 2FA"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

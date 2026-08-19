import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#2f7af8_0%,#5360f4_52%,#7448e9_100%)] px-6 py-10 text-primary-foreground shadow-[0_18px_50px_rgba(47,122,248,0.18)] sm:px-10">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Welcome, {session.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">Manage your travel operations from one place.</p>
      </div>
    </div>
  );
}

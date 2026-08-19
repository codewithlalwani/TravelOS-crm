import Link from "next/link";
import { redirect } from "next/navigation";
import { getLoginChallengeId } from "@/lib/auth/session";
import { verifyOtpAction } from "../actions";

export default async function OtpPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  if (!await getLoginChallengeId()) redirect("/login?error=Your login request has expired");
  const { error, sent } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030a14] px-5 text-white">
      <section className="w-full max-w-md rounded-[26px] border border-[#344157] bg-[#07111e] p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold">Two-factor verification</h1>
        <p className="mt-3 text-center text-sm text-[#aab4c6]">
          A 6-digit code was sent to your email{sent ? ` at ${sent}` : ""}. Enter it below to finish signing in.
        </p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <form action={verifyOtpAction} className="mt-6">
          <label htmlFor="code" className="mb-2 block text-sm font-semibold">Verification code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus className="h-14 w-full rounded-xl border border-[#26344a] bg-[#0c1626] px-5 text-center text-2xl tracking-[0.4em] outline-none focus:border-[#3978ff]" />
          <button type="submit" className="mt-5 h-14 w-full rounded-xl bg-gradient-to-r from-[#397cff] via-[#3b56f3] to-[#7540df] font-semibold">Verify and sign in</button>
        </form>
        <Link href="/login" className="mt-5 block text-center text-sm text-[#6a9cff]">Cancel and return to sign in</Link>
      </section>
    </main>
  );
}

import loginArtwork from "../../doc/newlogin.png";
import { IconAlertTriangle, IconLock, IconMail } from "@/components/icons";
import PasswordInput from "@/components/PasswordInput";
import { login } from "./actions";
import SubmitButton from "./SubmitButton";

const fieldClass =
  "h-14 w-full rounded-xl border border-[#26344a] bg-[#0c1626]/80 pl-14 pr-5 text-base text-white outline-none transition placeholder:text-[#94a0b4] focus:border-[#3978ff] focus:ring-2 focus:ring-[#3978ff]/20";

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3c2.1 2.4 3.2 5.4 3.2 9S14.1 18.6 12 21M12 3C9.9 5.4 8.8 8.4 8.8 12S9.9 18.6 12 21" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <span aria-hidden className="grid h-7 w-7 grid-cols-2 gap-[2px]">
      <i className="bg-[#f35325]" /><i className="bg-[#81bc06]" />
      <i className="bg-[#05a6f0]" /><i className="bg-[#ffba08]" />
    </span>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.5c2-1.9 2.7-4.6 2.7-7.7Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.4l-3.4-2.7c-.9.6-2.1 1-3.4 1a6 6 0 0 1-5.6-4.1H2.9v2.8A10.3 10.3 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8a6.2 6.2 0 0 1 0-3.6V7.4H2.9a10.2 10.2 0 0 0 0 9.2l3.5-2.8Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10.3 10.3 0 0 0-9.1 5.4l3.5 2.8A6 6 0 0 1 12 6Z" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/dashboard";

  return (
    <main className="min-h-screen bg-[#030a14] text-white lg:flex lg:h-screen lg:overflow-hidden">
      <section
        className="relative hidden h-full w-[52%] shrink-0 overflow-hidden bg-left bg-no-repeat lg:block"
        aria-label="Travel OS platform overview"
        style={{
          backgroundImage: `url(${loginArtwork.src})`,
          backgroundSize: "193% 100%",
        }}
      >
        <span className="sr-only">
          Travel OS — smart tools and seamless travel, with booking, customer, payment and reporting features
        </span>
      </section>

      <section className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden px-5 py-24 sm:px-10 lg:min-h-0 lg:px-12 lg:py-7">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_45%_45%,rgba(25,62,113,0.12),transparent_48%)]" />

        <button type="button" className="absolute right-5 top-3 z-10 flex h-11 items-center gap-2.5 rounded-xl border border-[#28364a] bg-[#07101d] px-4 text-[15px] text-[#e7eaf0] shadow-lg shadow-black/20 sm:right-10 lg:right-12">
          <GlobeIcon />
          <span>English</span>
          <svg aria-hidden viewBox="0 0 20 20" className="ml-1 h-4 w-4 fill-none stroke-[#9aa7bb]" strokeWidth="2"><path d="m4 7 6 6 6-6" /></svg>
        </button>

        <div className="relative w-full max-w-[620px] rounded-[26px] border border-[#344157] bg-[#07111e]/76 px-6 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:px-11 sm:py-9">
          <header className="text-center">
            <h1 className="text-[27px] font-bold tracking-[-0.02em]">Welcome Back</h1>
            <p className="mt-2.5 text-base text-[#aab4c6]">Sign in to access your Travel OS account</p>
          </header>

          {params.error && (
            <div role="alert" className="mt-7 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{params.error}</span>
            </div>
          )}

          <form action={login} className="mt-7">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="latitude" />
            <input type="hidden" name="longitude" />
            <input type="hidden" name="locationAccuracy" />

            <div>
              <label htmlFor="email" className="mb-2 block text-[15px] font-semibold">Email Address</label>
              <div className="relative">
                <IconMail className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#a5b1c4]" />
                <input id="email" name="email" type="email" required autoFocus autoComplete="email" placeholder="Enter your email" className={fieldClass} />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="password" className="mb-2 block text-[15px] font-semibold">Password</label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`${fieldClass} pr-14`}
                leadingIcon={<IconLock className="h-5 w-5 text-[#a5b1c4]" />}
                toggleClassName="absolute inset-y-0 right-0 flex items-center px-5 text-[#9aa7bb] transition hover:text-white"
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <label htmlFor="remember" className="flex items-center gap-2.5 text-sm">
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <input id="remember" name="remember" type="checkbox" value="1" defaultChecked className="peer h-5 w-5 appearance-none rounded-[5px] border border-[#5776b5] bg-[#0d1726] checked:border-[#3977f7] checked:bg-[#3977f7] focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute h-4 w-4 fill-none stroke-white opacity-0 peer-checked:opacity-100" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg>
                </span>
                Remember me
              </label>
              <a href="#" className="text-sm text-[#4080ff] transition hover:text-[#6a9cff]">Forgot Password?</a>
            </div>

            <div className="mt-7"><SubmitButton /></div>
          </form>

          <div className="my-6 flex items-center gap-6 text-[#aab4c6]">
            <span className="h-px flex-1 bg-[#364257]" />
            <span className="text-sm">or continue with</span>
            <span className="h-px flex-1 bg-[#364257]" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button type="button" className="flex h-14 items-center justify-center gap-3 rounded-xl border border-[#28364a] bg-[#0b1523]/70 text-base transition hover:border-[#466087] hover:bg-[#101d30]"><MicrosoftLogo />Microsoft</button>
            <button type="button" className="flex h-14 items-center justify-center gap-3 rounded-xl border border-[#28364a] bg-[#0b1523]/70 text-base transition hover:border-[#466087] hover:bg-[#101d30]"><GoogleLogo />Google</button>
          </div>

          <p className="mt-7 text-center text-sm">New to Travel OS? <a href="#" className="ml-1 text-[#4080ff] hover:text-[#6a9cff]">Create an account</a></p>
        </div>
      </section>
    </main>
  );
}

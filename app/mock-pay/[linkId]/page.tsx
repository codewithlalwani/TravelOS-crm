import Image from "next/image";
import { IconCheckCircle } from "@/components/icons";
import { simulatePayment } from "./actions";

export default async function MockPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ linkId: string }>;
  searchParams: Promise<{ amount?: string; currency?: string; ref?: string; paid?: string; error?: string }>;
}) {
  const { linkId } = await params;
  const { amount, currency, ref, paid, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center">
          <Image src="/logo.png" alt="fsn TravelTech" width={539} height={287} className="h-12 w-auto rounded-lg" priority />
        </div>

        <div className="rounded-2xl bg-card p-8 shadow-xl">
          {paid ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <IconCheckCircle className="h-6 w-6" />
              </div>
              <h1 className="font-heading text-lg font-semibold text-card-foreground">Payment successful</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you! Your payment has been received and the booking has been updated automatically.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-lg font-semibold text-card-foreground">Confirm payment</h1>
              <p className="mt-1 text-sm text-muted-foreground">Booking reference {ref}</p>

              {error && (
                <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
                  Something went wrong processing the payment. Please try again.
                </div>
              )}

              <div className="mt-6 rounded-xl bg-muted p-4 text-center">
                <p className="text-xs text-muted-foreground">Amount due</p>
                <p className="font-heading text-2xl font-semibold text-foreground">
                  {currency} {Number(amount || 0).toFixed(2)}
                </p>
              </div>

              <form action={simulatePayment} className="mt-6">
                <input type="hidden" name="gatewayLinkId" value={linkId} />
                <input type="hidden" name="amount" value={amount} />
                <input type="hidden" name="currency" value={currency} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Pay Now (mock)
                </button>
              </form>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                This is a mocked PayGlocal checkout used until real credentials are wired in.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

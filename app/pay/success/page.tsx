import Image from "next/image";
import { IconCheckCircle } from "@/components/icons";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ txnId?: string; amount?: string; currency?: string; gid?: string }>;
}) {
  const { txnId, amount, currency, gid } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary px-4">
      <div className="w-full max-w-sm">
      

        <div className="rounded-2xl bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <IconCheckCircle className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-card-foreground">Payment successful</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Thank you! Your payment has been received and the booking has been updated automatically.
          </p>

          {(txnId || amount) && (
            <div className="mt-6 rounded-xl bg-muted p-4 text-center">
              {amount && (
                <>
                  <p className="text-xs text-muted-foreground">Amount paid</p>
                  <p className="font-heading text-2xl font-semibold text-foreground">
                    {currency} {Number(amount).toFixed(2)}
                  </p>
                </>
              )}
              {txnId && <p className="mt-2 text-xs text-muted-foreground">Reference: {txnId}</p>}
              {gid && <p className="mt-1 text-xs text-muted-foreground">Transaction ID: {gid}</p>}
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">You may now close this window.</p>
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import { IconAlertTriangle } from "@/components/icons";

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ txnId?: string; gid?: string }>;
}) {
  const { txnId, gid } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary px-4">
      <div className="w-full max-w-sm">
      

        <div className="rounded-2xl bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <IconAlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-lg font-semibold text-card-foreground">Payment unsuccessful</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn&apos;t process your payment. No amount has been captured. Please contact your travel agent to try again.
          </p>

          {txnId && <p className="mt-6 text-xs text-muted-foreground">Reference: {txnId}</p>}
          {gid && <p className="mt-1 text-xs text-muted-foreground">Transaction ID: {gid}</p>}
        </div>
      </div>
    </div>
  );
}

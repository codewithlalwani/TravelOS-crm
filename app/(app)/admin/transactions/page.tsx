import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listTransactions } from "@/services/transactionService";
import { Pagination } from "@/components/Pagination";
import { AutoRefresh } from "@/components/AutoRefresh";
import { TableScrollArea } from "@/components/TableScrollArea";
import { IconSearch } from "@/components/icons";
import type { PaymentStatus } from "@/models/Payment";

function gatewayStatus(gatewayResponse: Record<string, unknown> | null): string {
  const value = gatewayResponse?.status;
  return typeof value === "string" && value ? value : "—";
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  success: "Success",
  failed: "Failed",
};

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: "bg-warning-bg text-warning",
  success: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
};

const STATUS_TYPES = Object.keys(STATUS_LABEL) as PaymentStatus[];

function isPaymentStatus(value: string | undefined): value is PaymentStatus {
  return !!value && (STATUS_TYPES as string[]).includes(value);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "payments.view")) redirect(defaultPathFor(perms));

  const { status, q, page } = await searchParams;
  const validStatus = isPaymentStatus(status) ? status : undefined;

  const { rows, total, page: currentPage, pageSize } = await listTransactions({
    status: validStatus,
    q,
    page: page ? Number(page) : 1,
  });

  function tabHrefFor(s?: PaymentStatus): string {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    return `/admin/transactions?${params.toString()}`;
  }

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const hasFilters = !!validStatus || !!q;
  // Nothing left to arrive from the gateway once the tab is scoped to a terminal status.
  const shouldPoll = !validStatus || validStatus === "pending";

  return (
    <div>
      <AutoRefresh enabled={shouldPoll} />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Payment transactions recorded from PayGlocal webhook callbacks and manual entries, across all bookings.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link href={tabHrefFor(undefined)} className={tabClass(!validStatus)}>
            All
          </Link>
          {STATUS_TYPES.map((s) => (
            <Link key={s} href={tabHrefFor(s)} className={tabClass(validStatus === s)}>
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>

        <form action="/admin/transactions" method="GET" className="flex flex-wrap items-center gap-2">
          {validStatus && <input type="hidden" name="status" value={validStatus} />}
          <div className="relative w-full sm:w-64">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Search booking ref, customer, transaction ID…"
              className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href="/admin/transactions"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <TableScrollArea>
          <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Paid At</th>
              <th className="px-4 py-3 font-medium">Booking</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Transaction ID</th>
              <th className="px-4 py-3 font-medium">Gateway Ref</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">PayGlocal Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((txn) => (
              <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {txn.paidAt ? txn.paidAt.toLocaleString() : txn.createdAt.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {txn.booking ? (
                    <Link href={`/bookings/${txn.booking.id}`} className="font-medium text-primary hover:underline">
                      {txn.booking.bookingRef}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">
                  {txn.booking?.customer?.name ?? <span className="text-muted-foreground">—</span>}
                  {txn.booking?.customer?.email && (
                    <span className="block text-xs text-muted-foreground">{txn.booking.customer.email}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">
                  {txn.amountPaid ? `${txn.currency} ${Number(txn.amountPaid).toFixed(2)}` : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-foreground">{txn.paymentMethod || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{txn.transactionId || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{txn.gatewayReferenceNumber || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[txn.status as PaymentStatus]}`}
                  >
                    {STATUS_LABEL[txn.status as PaymentStatus]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{gatewayStatus(txn.gatewayResponse)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  {hasFilters ? "No transactions match your filters." : "No transactions yet."}
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </TableScrollArea>

        <Pagination
          basePath="/admin/transactions"
          q={q}
          extraParams={{ status: validStatus }}
          page={currentPage}
          pageSize={pageSize}
          total={total}
        />
      </div>
    </div>
  );
}

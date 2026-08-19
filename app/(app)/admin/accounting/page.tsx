import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { listAccountingEntries } from "@/services/accountingService";
import { Pagination } from "@/components/Pagination";
import { IconSearch, IconDownload } from "@/components/icons";
import { FareBreakdownTable } from "@/components/FareBreakdownTable";
import { TopScrollArea } from "@/components/TopScrollArea";
import type { PaymentStatus } from "@/models/Payment";

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

function money(value: string | number | null | undefined, currency?: string | null): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${currency ? currency + " " : ""}${n.toFixed(2)}`;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "payments.view")) redirect(defaultPathFor(perms));

  const { status, q, page } = await searchParams;
  const validStatus = isPaymentStatus(status) ? status : undefined;

  const { rows, total, page: currentPage, pageSize } = await listAccountingEntries({
    status: validStatus,
    q,
    page: page ? Number(page) : 1,
  });

  function tabHrefFor(s?: PaymentStatus): string {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    return `/admin/accounting?${params.toString()}`;
  }

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const hasFilters = !!validStatus || !!q;

  const exportParams = new URLSearchParams();
  if (validStatus) exportParams.set("status", validStatus);
  if (q) exportParams.set("q", q);
  const exportHref = `/api/admin/accounting/export?${exportParams.toString()}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Payer details, per-passenger MCO breakdown and payment received amounts across all bookings.
          </p>
        </div>
        <a
          href={exportHref}
          download
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <IconDownload className="h-4 w-4" />
          Download Report
        </a>
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

        <form action="/admin/accounting" method="GET" className="flex flex-wrap items-center gap-2">
          {validStatus && <input type="hidden" name="status" value={validStatus} />}
          <div className="relative w-full sm:w-64">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Search booking ref, payer, transaction ID…"
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
              href="/admin/accounting"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <TopScrollArea className="overflow-x-auto rounded-t-2xl">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Paid At</th>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Payer Name</th>
                <th className="px-4 py-3 font-medium">Payer Email</th>
                <th className="px-4 py-3 font-medium">Mobile Number</th>
                <th className="px-4 py-3 font-medium">Transaction ID</th>
                <th className="px-4 py-3 font-medium">Fare Breakdown</th>
                <th className="px-4 py-3 text-right font-medium">Amount Received</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((txn) => {
                const booking = txn.booking;
                const customer = booking?.customer;
                const fares = booking?.fares ?? [];
                const passengerCounts = (booking?.passengers ?? []).reduce<Record<string, number>>((acc, p) => {
                  acc[p.paxType] = (acc[p.paxType] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <tr key={txn.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {txn.paidAt ? txn.paidAt.toLocaleString() : txn.createdAt.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {booking ? (
                        <Link href={`/bookings/${booking.id}`} className="font-medium text-primary hover:underline">
                          {booking.bookingRef}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {customer?.name ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{customer?.email || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{customer?.phone || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{txn.transactionId || "—"}</td>
                    <td className="px-4 py-3">
                      <FareBreakdownTable
                        fares={fares}
                        passengerCounts={passengerCounts}
                        currency={booking?.currency}
                        mcoOnly
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">
                      {money(txn.amountPaid, txn.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_BADGE[txn.status as PaymentStatus]}`}
                      >
                        {STATUS_LABEL[txn.status as PaymentStatus]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    {hasFilters ? "No entries match your filters." : "No accounting entries yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TopScrollArea>

        <Pagination
          basePath="/admin/accounting"
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

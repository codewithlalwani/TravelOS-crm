import { redirect } from "next/navigation";
import { listCustomers } from "@/services/customerQueryService";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions, defaultPathFor } from "@/lib/auth/rbac";
import { ListSearch } from "@/components/ListSearch";
import { Pagination } from "@/components/Pagination";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getCurrentSession();
  const perms = await getPermissions(session);
  if (!can(perms, "customers.view")) redirect(defaultPathFor(perms));

  const { q, page } = await searchParams;
  const { rows, total, page: currentPage, pageSize } = await listCustomers({
    q,
    page: page ? Number(page) : 1,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone captured while creating a booking, with their email and how many bookings they have.
        </p>
      </div>

      <ListSearch basePath="/customers" q={q} placeholder="Search name, email, or phone..." />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ customer, bookingsCount }) => (
              <tr key={customer.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{customer.phone || "—"}</td>
                <td className="px-4 py-3 text-foreground">{bookingsCount}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  {q ? `No customers match "${q}".` : "No customers yet. They're captured automatically when you create a booking."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination basePath="/customers" q={q} page={currentPage} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}

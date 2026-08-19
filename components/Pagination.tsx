import Link from "next/link";

export function Pagination({
  basePath,
  q,
  page,
  pageSize,
  total,
  extraParams,
}: {
  basePath: string;
  q?: string;
  page: number;
  pageSize: number;
  total: number;
  extraParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  function hrefFor(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const linkClass =
    "rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted";
  const disabledClass = "rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page <= 1 ? (
          <span className={disabledClass}>Previous</span>
        ) : (
          <Link href={hrefFor(page - 1)} className={linkClass}>
            Previous
          </Link>
        )}
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        {page >= totalPages ? (
          <span className={disabledClass}>Next</span>
        ) : (
          <Link href={hrefFor(page + 1)} className={linkClass}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

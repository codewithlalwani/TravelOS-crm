import { IconSearch } from "@/components/icons";

export function ListSearch({
  basePath,
  q,
  placeholder,
}: {
  basePath: string;
  q?: string;
  placeholder: string;
}) {
  return (
    <form action={basePath} method="GET" className="mb-4 flex max-w-sm items-center gap-2">
      <div className="relative flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        Search
      </button>
    </form>
  );
}

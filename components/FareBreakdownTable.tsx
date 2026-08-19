import { PAX_TYPE_LABEL, type PaxType } from "@/lib/booking/paxTypes";

function money(value: string | number | null | undefined, currency?: string | null): string {
  const n = Number(value ?? 0);
  return `${currency ? currency + " " : ""}${(Number.isNaN(n) ? 0 : n).toFixed(2)}`;
}

export function FareBreakdownTable({
  fares,
  passengerCounts,
  currency,
  mcoOnly = false,
}: {
  fares: Array<{ paxType: PaxType; gross: string | number; net: string | number; mco: string | number }>;
  passengerCounts: Record<string, number>;
  currency?: string | null;
  mcoOnly?: boolean;
}) {
  if (fares.length === 0) {
    return <p className="text-sm text-muted-foreground">No fare details recorded for this booking.</p>;
  }

  const rows = fares.map((f) => {
    const count = passengerCounts[f.paxType] ?? 1;
    return {
      paxType: f.paxType,
      count,
      gross: Number(f.gross) * count,
      net: Number(f.net) * count,
      mco: Number(f.mco) * count,
    };
  });
  const totalGross = rows.reduce((sum, r) => sum + r.gross, 0);
  const totalNet = rows.reduce((sum, r) => sum + r.net, 0);
  const totalMco = rows.reduce((sum, r) => sum + r.mco, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-3 font-medium"></th>
            {!mcoOnly && <th className="pb-2 pr-3 text-right font-medium">Gross</th>}
            {!mcoOnly && <th className="pb-2 pr-3 text-right font-medium">Net</th>}
            <th className="pb-2 text-right font-medium">MCO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.paxType} className="border-t border-border">
              <td className="py-2 pr-3 font-medium text-foreground">
                {PAX_TYPE_LABEL[r.paxType]} ({r.count})
              </td>
              {!mcoOnly && <td className="py-2 pr-3 text-right text-foreground">{money(r.gross, currency)}</td>}
              {!mcoOnly && <td className="py-2 pr-3 text-right text-foreground">{money(r.net, currency)}</td>}
              <td className="py-2 text-right font-medium text-foreground">{money(r.mco, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border">
            <td className="pt-3 pr-3 font-semibold text-foreground">Total Pricing</td>
            {!mcoOnly && (
              <td className="pt-3 pr-3 text-right font-semibold text-foreground">{money(totalGross, currency)}</td>
            )}
            {!mcoOnly && (
              <td className="pt-3 pr-3 text-right font-semibold text-foreground">{money(totalNet, currency)}</td>
            )}
            <td className="pt-3 text-right font-semibold text-primary">{money(totalMco, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

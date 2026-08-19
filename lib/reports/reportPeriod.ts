export interface ReportPeriod {
  from?: string;
  to?: string;
  isDefaultMtd: boolean;
}

function localDateTime(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Applies month-to-date only when the caller supplied no explicit period. */
export function resolveReportPeriod(from?: string, to?: string, now = new Date()): ReportPeriod {
  if (from || to) return { from, to, isDefaultMtd: false };
  return {
    from: localDateTime(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)),
    to: localDateTime(now),
    isDefaultMtd: true,
  };
}

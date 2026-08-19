"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ReportView = "all" | "agents" | "bookings";

interface ReportControlsProps {
  from?: string;
  to?: string;
  view: ReportView;
  agentId?: number;
  isDefaultPeriod?: boolean;
}

function toInputValue(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayRange(from?: string, to?: string): string {
  if (!from && !to) return "All time";
  const format = (value: string) => new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
  if (from && to) return `${format(from)} – ${format(to)}`;
  return from ? `From ${format(from)}` : `Until ${format(to!)}`;
}

export function ReportControls({ from, to, view, agentId, isDefaultPeriod = false }: ReportControlsProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(to ?? "");

  const exportParams = new URLSearchParams();
  if (view !== "all") exportParams.set("view", view);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (agentId) exportParams.set("agentId", String(agentId));
  const pdfParams = new URLSearchParams(exportParams);
  pdfParams.set("format", "pdf");
  const excelParams = new URLSearchParams(exportParams);
  excelParams.set("format", "xlsx");

  function navigate(next: { from?: string; to?: string; view?: ReportView; agentId?: number | null }) {
    const params = new URLSearchParams();
    const nextView = next.view ?? view;
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    const nextAgentId = next.agentId === null ? undefined : next.agentId ?? agentId;
    if (nextView !== "all") params.set("view", nextView);
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    if (nextAgentId) params.set("agentId", String(nextAgentId));
    router.push(`/reports${params.size ? `?${params}` : ""}`);
  }

  function setPreset(preset: "today" | "yesterday" | "7days" | "30days" | "month" | "lastMonth" | "year") {
    const now = new Date();
    let rangeStart = new Date(now);
    let rangeEnd = new Date(now);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd.setHours(23, 59, 59, 999);

    if (preset === "yesterday") {
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeEnd.setDate(rangeEnd.getDate() - 1);
    } else if (preset === "7days" || preset === "30days") {
      rangeStart.setDate(rangeStart.getDate() - (preset === "7days" ? 6 : 29));
    } else if (preset === "month") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "lastMonth") {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (preset === "year") {
      rangeStart = new Date(now.getFullYear(), 0, 1);
    }

    setStart(toInputValue(rangeStart));
    setEnd(toInputValue(rangeEnd));
  }

  function apply() {
    const params = new URLSearchParams();
    if (view !== "all") params.set("view", view);
    if (start) params.set("from", start);
    if (end) params.set("to", end);
    if (agentId) params.set("agentId", String(agentId));
    router.push(`/reports${params.size ? `?${params}` : ""}`);
    dialogRef.current?.close();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="report-view">Report view</label>
      <select
        id="report-view"
        value={view}
        onChange={(event) => navigate({ view: event.target.value as ReportView, agentId: null })}
        className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary"
      >
        <option value="all">All reports</option>
        <option value="agents">Agent performance</option>
        <option value="bookings">Booking report</option>
      </select>

      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
      >
        <span aria-hidden="true">▣</span>
        {displayRange(from, to)}
      </button>

      <a
        href={`/api/reports/export?${pdfParams}`}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
      >
        <span aria-hidden="true">⇩</span>
        Export PDF
      </a>

      <a
        href={`/api/reports/export?${excelParams}`}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary bg-card px-4 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5"
      >
        <span aria-hidden="true">⇩</span>
        Export Excel
      </a>

      {!isDefaultPeriod && (from || to) && (
        <button type="button" onClick={() => router.push(view === "all" ? "/reports" : `/reports?view=${view}${agentId ? `&agentId=${agentId}` : ""}`)} className="h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          Reset to MTD
        </button>
      )}

      <dialog ref={dialogRef} className="m-auto w-[min(760px,calc(100%-2rem))] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/55">
        <div className="border-b border-border px-6 py-5">
          <h2 className="font-heading text-lg font-semibold">Select time period</h2>
          <p className="mt-1 text-sm text-muted-foreground">Filter both agent performance and booking data.</p>
        </div>
        <div className="grid md:grid-cols-[1fr_220px]">
          <div className="space-y-5 p-6">
            <label className="block text-sm font-medium text-muted-foreground">
              Start date &amp; time
              <input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary" />
            </label>
            <label className="block text-sm font-medium text-muted-foreground">
              End date &amp; time
              <input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4 md:grid-cols-1 md:border-l md:border-t-0">
            {([
              ["today", "Today"], ["yesterday", "Yesterday"], ["7days", "Last 7 days"],
              ["30days", "Last 30 days"], ["month", "This month"], ["lastMonth", "Last month"], ["year", "This year"],
            ] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setPreset(key)} className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted hover:text-primary">
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="button" onClick={apply} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Apply</button>
        </div>
      </dialog>
    </div>
  );
}

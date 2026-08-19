import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { generateReportPdf, type ReportPdfView } from "@/lib/reports/generateReportPdf";
import { generateReportExcel } from "@/lib/reports/generateReportExcel";
import { resolveReportPeriod } from "@/lib/reports/reportPeriod";
import { getReportsData } from "@/services/reportService";

function reportView(value: string | null): ReportPdfView {
  return value === "agents" || value === "bookings" ? value : "all";
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = await getPermissions(session);
  const isAgent = session.roleKey === "agent";
  if (!isAgent && !can(permissions, "analytics.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = reportView(searchParams.get("view"));
  const period = resolveReportPeriod(searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined);
  const requestedAgentId = Number(searchParams.get("agentId"));
  const agentId = isAgent
    ? session.userId
    : Number.isInteger(requestedAgentId) && requestedAgentId > 0
      ? requestedAgentId
      : undefined;
  const data = await getReportsData({ from: period.from, to: period.to, agentId });
  const agentName = agentId ? data.performance.find((agent) => agent.agentId === agentId)?.agent : undefined;
  const suffix = view === "all" ? "all" : view;
  const agentSlug = agentName ? `${agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-` : "";
  const datedName = `reports-${agentSlug}${suffix}-${new Date().toISOString().slice(0, 10)}`;

  if (searchParams.get("format") === "xlsx") {
    const excel = await generateReportExcel({ data, view, from: period.from, to: period.to, agentName });
    return new NextResponse(new Uint8Array(excel), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${datedName}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = await generateReportPdf({ data, view, from: period.from, to: period.to, agentName });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${datedName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

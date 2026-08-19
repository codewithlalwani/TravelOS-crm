import ExcelJS from "exceljs";
import { BOOKING_TYPE_LABEL } from "@/models/Booking";
import type { ReportsData } from "@/services/reportService";
import type { ReportPdfView } from "./generateReportPdf";

interface ReportExcelParams {
  data: ReportsData;
  view: ReportPdfView;
  from?: string;
  to?: string;
  agentName?: string;
}

const NAVY = "172554";
const BLUE = "2563EB";
const PALE_BLUE = "EFF6FF";
const WHITE = "FFFFFF";
const TEXT = "1E293B";
const MUTED = "64748B";

function period(from?: string, to?: string): string {
  if (!from && !to) return "All time";
  const display = (value: string) => new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
  if (from && to) return `${display(from)} – ${display(to)}`;
  return from ? `From ${display(from)}` : `Until ${display(to!)}`;
}

function setupSheet(sheet: ExcelJS.Worksheet, title: string, subtitle: string, columnCount: number) {
  sheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: "Aptos Display", size: 20, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 34;

  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: "Aptos", size: 10, color: { argb: MUTED } };
  sheet.getRow(2).height = 22;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });
}

function addPerformanceSheet(workbook: ExcelJS.Workbook, params: ReportExcelParams) {
  const sheet = workbook.addWorksheet("Agent Performance");
  setupSheet(sheet, "Agent Performance Report", `${period(params.from, params.to)} · Generated ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, 4);
  sheet.getCell("A4").value = "Total MCO (USD)";
  sheet.getCell("A4").font = { name: "Aptos", size: 10, bold: true, color: { argb: MUTED } };
  sheet.getCell("B4").value = params.data.totalMcoUsd;
  sheet.getCell("B4").numFmt = '$#,##0.00;[Red]($#,##0.00);-';
  sheet.getCell("B4").font = { name: "Aptos", size: 14, bold: true, color: { argb: NAVY } };
  sheet.addRow(["Agent", "Managed by", "Bookings", "MCO (USD)"]);
  styleHeader(sheet.getRow(5));
  params.data.performance.forEach((agent) => {
    const row = sheet.addRow([agent.agent, agent.managedBy, agent.bookings, agent.mcoUsd]);
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '$#,##0.00;[Red]($#,##0.00);-';
  });
  sheet.autoFilter = { from: "A5", to: `D${Math.max(5, sheet.rowCount)}` };
  sheet.columns = [{ width: 28 }, { width: 28 }, { width: 14 }, { width: 18 }];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5 && rowNumber % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE_BLUE } }; });
    if (rowNumber > 5) row.eachCell((cell) => { cell.font = { name: "Aptos", size: 10, color: { argb: TEXT } }; });
  });
}

function addBookingsSheet(workbook: ExcelJS.Workbook, params: ReportExcelParams) {
  const sheet = workbook.addWorksheet("Bookings");
  const scope = params.agentName ? `Agent: ${params.agentName} · ` : "";
  setupSheet(sheet, params.agentName ? `${params.agentName} – Booking Report` : "Booking Report", `${scope}${period(params.from, params.to)} · ${params.data.bookings.length} bookings`, 10);
  sheet.getCell("A4").value = "Total MCO (USD)";
  sheet.getCell("B4").value = params.data.totalMcoUsd;
  sheet.getCell("B4").numFmt = '$#,##0.00;[Red]($#,##0.00);-';
  sheet.getCell("A4").font = { name: "Aptos", size: 10, bold: true, color: { argb: MUTED } };
  sheet.getCell("B4").font = { name: "Aptos", size: 14, bold: true, color: { argb: NAVY } };
  sheet.addRow(["#", "Date", "Booking Number", "Agent", "MCO (USD)", "Status", "Type", "Customer", "Phone", "Email"]);
  styleHeader(sheet.getRow(5));
  params.data.bookings.forEach((booking, index) => {
    const converted = params.data.mcoUsdByBookingId[booking.id];
    const row = sheet.addRow([
      index + 1,
      booking.createdAt,
      booking.bookingRef,
      booking.agent?.name ?? "—",
      converted === null ? "Rate unavailable" : converted ?? 0,
      booking.status,
      BOOKING_TYPE_LABEL[booking.type],
      booking.customer?.name ?? "—",
      booking.customer?.phone ?? "—",
      booking.customer?.email ?? "—",
    ]);
    row.getCell(2).numFmt = "dd-mmm-yyyy";
    if (typeof row.getCell(5).value === "number") row.getCell(5).numFmt = '$#,##0.00;[Red]($#,##0.00);-';
  });
  sheet.autoFilter = { from: "A5", to: `J${Math.max(5, sheet.rowCount)}` };
  sheet.columns = [
    { width: 7 }, { width: 15 }, { width: 19 }, { width: 24 }, { width: 18 },
    { width: 23 }, { width: 16 }, { width: 26 }, { width: 18 }, { width: 32 },
  ];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5 && rowNumber % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE_BLUE } }; });
    if (rowNumber > 5) row.eachCell((cell) => { cell.font = { name: "Aptos", size: 10, color: { argb: TEXT } }; });
  });
}

export async function generateReportExcel(params: ReportExcelParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Travelos CRM";
  workbook.created = new Date();
  if (params.view !== "bookings") addPerformanceSheet(workbook, params);
  if (params.view !== "agents") addBookingsSheet(workbook, params);
  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

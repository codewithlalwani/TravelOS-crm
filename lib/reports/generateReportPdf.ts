import PDFDocument from "pdfkit";
import { BOOKING_TYPE_LABEL } from "@/models/Booking";
import type { ReportsData } from "@/services/reportService";

export type ReportPdfView = "all" | "agents" | "bookings";

interface ReportPdfParams {
  data: ReportsData;
  view: ReportPdfView;
  from?: string;
  to?: string;
  agentName?: string;
}

function money(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function date(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function period(from?: string, to?: string): string {
  if (!from && !to) return "All time";
  const display = (value: string) => new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
  if (from && to) return `${display(from)} - ${display(to)}`;
  return from ? `From ${display(from)}` : `Until ${display(to!)}`;
}

export function generateReportPdf({ data, view, from, to, agentName }: ReportPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 36;
    const pageWidth = 769;
    const navy = "#172554";
    const muted = "#64748b";
    const border = "#dbe2ea";

    const heading = (title: string) => {
      if (doc.y > 510) doc.addPage();
      doc.moveDown(0.7).font("Helvetica-Bold").fontSize(13).fillColor(navy).text(title);
      doc.moveDown(0.35).font("Helvetica");
    };

    const tableHeader = (labels: string[], widths: number[]) => {
      const y = doc.y;
      doc.rect(left, y, pageWidth, 22).fill(navy);
      let x = left;
      labels.forEach((label, index) => {
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).text(label, x + 5, y + 7, { width: widths[index] - 10 });
        x += widths[index];
      });
      doc.y = y + 22;
    };

    const tableRow = (values: string[], widths: number[], alignRight: number[] = []) => {
      if (doc.y > 535) doc.addPage();
      const y = doc.y;
      let x = left;
      values.forEach((value, index) => {
        doc.fillColor("#1e293b").font("Helvetica").fontSize(7.5).text(value, x + 5, y + 6, {
          width: widths[index] - 10,
          height: 16,
          ellipsis: true,
          align: alignRight.includes(index) ? "right" : "left",
        });
        x += widths[index];
      });
      doc.moveTo(left, y + 24).lineTo(left + pageWidth, y + 24).strokeColor(border).stroke();
      doc.y = y + 24;
    };

    doc.font("Helvetica-Bold").fontSize(22).fillColor(navy).text(agentName ? `${agentName} – Booking Report` : "Reports", left, 34);
    doc.font("Helvetica").fontSize(9).fillColor(muted).text(period(from, to), left, 62);
    doc.text(`Generated ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`, left, 76);
    doc.y = 98;

    if (view !== "bookings") {
      doc.roundedRect(left, doc.y, 230, 54, 6).strokeColor(border).stroke();
      doc.fontSize(8).fillColor(muted).text("TOTAL MCO (USD)", left + 12, doc.y + 12);
      doc.font("Helvetica-Bold").fontSize(17).fillColor(navy).text(`$${money(data.totalMcoUsd)}`, left + 12, doc.y + 5);
      doc.font("Helvetica");
      if (data.unavailableConversionCount) {
        doc.fontSize(8).fillColor(muted).text(`${data.unavailableConversionCount} unavailable conversion(s) excluded.`, left + 250, doc.y - 17);
      }
      doc.y = 160;

      heading("Agent performance");
      const widths = [260, 260, 110, 139];
      tableHeader(["Agent", "Managed by", "Bookings", "MCO (USD)"], widths);
      data.performance.forEach((agent) => tableRow(
        [agent.agent, agent.managedBy, String(agent.bookings), `$${money(agent.mcoUsd)}`], widths, [2, 3]
      ));
      if (!data.performance.length) doc.fillColor(muted).fontSize(9).text("No performance data in this period.", left, doc.y + 8);
    }

    if (view !== "agents") {
      if (view === "all") doc.addPage();
      heading(`Booking report (${data.bookings.length})`);
      const widths = [34, 70, 80, 80, 70, 74, 116, 90, 155];
      tableHeader(["#", "Date", "Number", "MCO (USD)", "Status", "Type", "Name", "Phone", "Email"], widths);
      data.bookings.forEach((booking, index) => {
        const converted = data.mcoUsdByBookingId[booking.id];
        tableRow([
          String(index + 1),
          date(booking.createdAt),
          booking.bookingRef,
          converted === null ? "Unavailable" : `$${money(converted ?? 0)}`,
          booking.status,
          BOOKING_TYPE_LABEL[booking.type],
          booking.customer?.name ?? "-",
          booking.customer?.phone ?? "-",
          booking.customer?.email ?? "-",
        ], widths, [0, 3]);
      });
      if (!data.bookings.length) doc.fillColor(muted).fontSize(9).text("No bookings found for the selected period.", left, doc.y + 8);
    }

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(index);
      doc.font("Helvetica").fontSize(7).fillColor(muted).text(
        `Page ${index + 1} of ${range.count}`,
        left,
        doc.page.height - 24,
        { width: pageWidth, align: "right" }
      );
    }

    doc.end();
  });
}

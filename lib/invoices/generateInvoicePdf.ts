import PDFDocument from "pdfkit";
import { COMPANY } from "../company";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoicePdfParams {
  invoiceNo: string;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  currency: string;
  generatedAt: Date;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
}

function number(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function money(currency: string, amount: number): string {
  return `${currency} ${number(amount)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function generateInvoicePdf(params: InvoicePdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 50;
    const right = 545;
    const navy = COMPANY.colors.navy;
    const muted = COMPANY.colors.muted;
    const border = COMPANY.colors.border;

    // Header: logo (left, height-capped so it can't collide with the text below) + "INVOICE" title (right)
    doc.image(COMPANY.logoPath, left, 40, { fit: [140, 48] });
    doc.fillColor("#9ca3af").fontSize(26).text("INVOICE", left, 40, { width: right - left, align: "right" });
    doc.fillColor(muted).fontSize(10).text(`# ${params.invoiceNo}`, left, 72, { width: right - left, align: "right" });

    doc
      .moveTo(left, 100)
      .lineTo(right, 100)
      .strokeColor(border)
      .stroke();

    // Company identity block
    const identityTop = 114;
    doc.fillColor("#111827").fontSize(11).text(COMPANY.name, left, identityTop);
    doc.fillColor(muted).fontSize(9).text(`GSTIN: ${COMPANY.gstin}`, left, doc.y + 2);
    for (const line of COMPANY.addressLines) {
      doc.text(line, left);
    }

    // Date / Payment Terms / Due Date / Balance Due block (top-right)
    const total = params.lineItems.reduce((sum, li) => sum + li.amount, 0);
    const metaTop = identityTop;
    const labelX = 350;
    const valueW = right - labelX;
    doc.fillColor(muted).fontSize(9).text("Date:", labelX, metaTop, { width: 100 });
    doc.fillColor("#111827").text(formatDate(params.generatedAt), labelX, metaTop, { width: valueW, align: "right" });
    doc.fillColor(muted).text("Payment Terms:", labelX, metaTop + 16, { width: 150 });
    doc.fillColor("#111827").text("Payable Upon Receipt", labelX, metaTop + 16, { width: valueW, align: "right" });
    doc.fillColor(muted).text("Due Date:", labelX, metaTop + 32, { width: 150 });
    doc.fillColor("#111827").text(formatDate(params.dueDate), labelX, metaTop + 32, { width: valueW, align: "right" });

    doc.rect(labelX - 10, metaTop + 48, right - labelX + 10, 24).fill(navy);
    doc.fillColor("#ffffff").fontSize(10).text("Balance Due:", labelX, metaTop + 55, { width: 150 });
    doc
      .font("Helvetica-Bold")
      .text(money(params.currency, total), labelX, metaTop + 55, { width: valueW, align: "right" })
      .font("Helvetica");

    // Bill To / Booking Details
    const billTop = 210;
    doc.fillColor(muted).fontSize(9).text("Bill To:", left, billTop);
    doc.fillColor("#111827").fontSize(10).text(params.customerName, left, billTop + 14);
    doc.fillColor("#374151").fontSize(9);
    if (params.customerPhone) doc.text(`Ph: ${params.customerPhone}`, left, doc.y, { width: 280 });
    doc.text(params.customerEmail, left, doc.y, { width: 280 });

    const detailsX = 320;
    doc.fillColor(muted).fontSize(9).text("Booking Details:", detailsX, billTop);
    doc.fillColor(muted).text("Booking Ref.", detailsX, billTop + 16, { width: 100 });
    doc.fillColor("#111827").text(params.bookingRef, detailsX, billTop + 16, { width: right - detailsX, align: "right" });
    doc.fillColor(muted).text("Invoice No.", detailsX, billTop + 32, { width: 100 });
    doc.fillColor("#111827").text(params.invoiceNo, detailsX, billTop + 32, { width: right - detailsX, align: "right" });

    // Item table
    const tableTop = billTop + 84;
    const colItem = left;
    const colQty = 345;
    const colRate = 405;
    const colAmt = 470;

    doc.rect(left, tableTop, right - left, 22).fill(navy);
    doc.fillColor("#ffffff").fontSize(9);
    doc.text("Item", colItem + 8, tableTop + 7);
    doc.text("Qty", colQty, tableTop + 7, { width: colRate - colQty - 8, align: "right" });
    doc.text("Rate", colRate, tableTop + 7, { width: colAmt - colRate - 8, align: "right" });
    doc.text("Amount", colAmt, tableTop + 7, { width: right - 8 - colAmt, align: "right" });

    let rowY = tableTop + 22;
    doc.fontSize(9);
    params.lineItems.forEach((item, index) => {
      const rowHeight = Math.max(22, doc.heightOfString(item.description, { width: colQty - colItem - 16 }) + 12);
      if (index % 2 === 1) {
        doc.rect(left, rowY, right - left, rowHeight).fill("#f8f9fb");
      }
      doc.fillColor("#111827");
      doc.text(item.description, colItem + 8, rowY + 7, { width: colQty - colItem - 16 });
      doc.text(String(item.quantity), colQty, rowY + 7, { width: colRate - colQty - 8, align: "right" });
      doc.text(number(item.rate), colRate, rowY + 7, { width: colAmt - colRate - 8, align: "right" });
      doc.text(number(item.amount), colAmt, rowY + 7, { width: right - 8 - colAmt, align: "right" });
      doc
        .moveTo(left, rowY + rowHeight)
        .lineTo(right, rowY + rowHeight)
        .strokeColor(border)
        .stroke();
      rowY += rowHeight;
    });

    doc.fillColor(muted).fontSize(8).text(`Rate and amount are in ${params.currency}.`, left, rowY + 6);

    // Totals
    const subtotal = total;
    const tax = 0;
    const totalsLabelX = 350;
    let totalsY = rowY + 26;
    doc.fillColor(muted).fontSize(9);
    doc.text("Subtotal:", totalsLabelX, totalsY, { width: colAmt - 8 - totalsLabelX, align: "right" });
    doc.fillColor("#111827").text(money(params.currency, subtotal), colAmt, totalsY, { width: right - 8 - colAmt, align: "right" });
    totalsY += 18;
    doc.fillColor(muted).text("Tax (0%):", totalsLabelX, totalsY, { width: colAmt - 8 - totalsLabelX, align: "right" });
    doc.fillColor("#111827").text(money(params.currency, tax), colAmt, totalsY, { width: right - 8 - colAmt, align: "right" });
    totalsY += 14;
    doc
      .moveTo(totalsLabelX, totalsY + 8)
      .lineTo(right, totalsY + 8)
      .strokeColor(border)
      .stroke();
    totalsY += 16;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(navy)
      .text("Total:", totalsLabelX, totalsY, { width: colAmt - 8 - totalsLabelX, align: "right" });
    doc.text(money(params.currency, subtotal + tax), colAmt, totalsY, { width: right - 8 - colAmt, align: "right" });
    doc.font("Helvetica").fontSize(9);

    // Notes / Terms
    let footerY = totalsY + 50;
    doc.fillColor(muted).fontSize(9).text("Notes:", left, footerY);
    footerY = doc.y + 2;
    doc
      .fillColor("#374151")
      .fontSize(9)
      .text(
        "Export of Services. GST treatment applied in accordance with applicable provisions of the CGST Act, 2017 and IGST Act, 2017.",
        left,
        footerY,
        { width: right - left }
      );

    footerY = doc.y + 16;
    doc.fillColor(muted).fontSize(9).text("Terms:", left, footerY);
    footerY = doc.y + 2;
    doc
      .fillColor("#374151")
      .fontSize(9)
      .text(
        "This invoice relates to travel arrangement services requested by the customer. Services are deemed delivered upon issuance of booking confirmation, itinerary, ticket, or travel voucher.",
        left,
        footerY,
        { width: right - left }
      );
    footerY = doc.y + 8;
    doc.text("Refunds and Cancellations are subject to applicable supplier and fare rules", left, footerY, { width: right - left });
    footerY = doc.y + 16;
    doc.fillColor(muted).text("This is a computer-generated invoice and does not require a physical signature.", left, footerY, {
      width: right - left,
    });

    footerY = doc.y + 10;
    doc
      .fillColor(navy)
      .fontSize(9)
      .text("Terms & Conditions", left, footerY, { link: COMPANY.termsUrl, underline: true, continued: true })
      .fillColor(muted)
      .text("   |   ", { link: undefined, underline: false, continued: true })
      .fillColor(navy)
      .text("Cancellation & Refund Policy", { link: COMPANY.refundPolicyUrl, underline: true });

    // Bottom contact band (anchored to the page bounds so it can't push a spillover page)
    const bandY = doc.page.height - doc.page.margins.bottom - 22;
    doc.moveTo(left, bandY).lineTo(right, bandY).strokeColor(border).stroke();
    doc
      .fillColor(muted)
      .fontSize(8)
      .text(`${COMPANY.website}   |   ${COMPANY.supportEmail}   |   ${COMPANY.supportPhone}`, left, bandY + 8, {
        width: right - left,
        align: "center",
      });

    doc.end();
  });
}

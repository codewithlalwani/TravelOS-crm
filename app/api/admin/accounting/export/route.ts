import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { can, getPermissions } from "@/lib/auth/rbac";
import { listAccountingEntriesForExport } from "@/services/accountingService";
import type { PaymentStatus } from "@/models/Payment";

const STATUS_TYPES: PaymentStatus[] = ["pending", "success", "failed"];

function isPaymentStatus(value: string | null): value is PaymentStatus {
  return !!value && (STATUS_TYPES as string[]).includes(value);
}

function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isNaN(n) ? "" : n.toFixed(2);
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissions(session);
  if (!can(perms, "payments.view")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const rows = await listAccountingEntriesForExport({
    status: isPaymentStatus(status) ? status : undefined,
    q: q ?? undefined,
  });

  const header = [
    "Paid At",
    "Booking Ref",
    "Payer Name",
    "Payer Email",
    "Mobile Number",
    "Transaction ID",
    "Currency",
    "Gross Amount",
    "Net Amount",
    "MCO Amount",
    "Amount Received",
    "Status",
  ];

  const lines = [header.map(csvField).join(",")];
  for (const txn of rows) {
    const booking = txn.booking;
    const customer = booking?.customer;
    lines.push(
      [
        csvField((txn.paidAt ?? txn.createdAt).toISOString()),
        csvField(booking?.bookingRef),
        csvField(customer?.name),
        csvField(customer?.email),
        csvField(customer?.phone),
        csvField(txn.transactionId),
        csvField(txn.currency),
        csvField(money(booking?.totalAmount)),
        csvField(money(booking?.netAmount)),
        csvField(money(booking?.mcoAmount)),
        csvField(money(txn.amountPaid)),
        csvField(txn.status),
      ].join(",")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `accounting-report-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

import { Op, type WhereOptions } from "sequelize";
import "../models/associations";
import { Payment, type PaymentStatus } from "../models/Payment";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { BookingFare } from "../models/BookingFare";
import { Passenger } from "../models/Passenger";
import { PaymentLink } from "../models/PaymentLink";

export interface ListAccountingEntriesParams {
  status?: PaymentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAccountingEntriesResult {
  rows: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

function buildAccountingWhere(params: Pick<ListAccountingEntriesParams, "status" | "q">): WhereOptions {
  const q = params.q?.trim();
  const conditions: WhereOptions[] = [];
  if (params.status) conditions.push({ status: params.status });
  if (q) {
    conditions.push({
      [Op.or]: [
        { transactionId: { [Op.like]: `%${q}%` } },
        { gatewayReferenceNumber: { [Op.like]: `%${q}%` } },
        { "$booking.booking_ref$": { [Op.like]: `%${q}%` } },
        { "$booking.customer.name$": { [Op.like]: `%${q}%` } },
        { "$booking.customer.email$": { [Op.like]: `%${q}%` } },
        { "$booking.customer.phone$": { [Op.like]: `%${q}%` } },
      ],
    });
  }
  return conditions.length ? { [Op.and]: conditions } : {};
}

export async function listAccountingEntries(
  params: ListAccountingEntriesParams = {}
): Promise<ListAccountingEntriesResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
  const where = buildAccountingWhere(params);

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include: [
      {
        model: Booking,
        as: "booking",
        attributes: ["id", "bookingRef", "type", "totalAmount", "netAmount", "mcoAmount", "currency"],
        include: [
          { model: Customer, as: "customer", attributes: ["id", "name", "email", "phone"] },
          { model: BookingFare, as: "fares", attributes: ["id", "paxType", "gross", "net", "mco"] },
          { model: Passenger, as: "passengers", attributes: ["id", "paxType"] },
        ],
      },
      { model: PaymentLink, as: "paymentLink", attributes: ["id", "gatewayProvider", "gatewayLinkId", "status"] },
    ],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    subQuery: false,
    distinct: true,
  });

  return { rows, total: count, page, pageSize };
}

export async function listAccountingEntriesForExport(
  params: Pick<ListAccountingEntriesParams, "status" | "q"> = {}
): Promise<Payment[]> {
  const where = buildAccountingWhere(params);

  return Payment.findAll({
    where,
    include: [
      {
        model: Booking,
        as: "booking",
        attributes: ["id", "bookingRef", "type", "totalAmount", "netAmount", "mcoAmount", "currency"],
        include: [{ model: Customer, as: "customer", attributes: ["id", "name", "email", "phone"] }],
      },
    ],
    order: [["createdAt", "DESC"]],
    subQuery: false,
  });
}

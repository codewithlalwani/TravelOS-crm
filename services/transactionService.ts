import { Op, type WhereOptions } from "sequelize";
import "../models/associations";
import { Payment, type PaymentStatus } from "../models/Payment";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { PaymentLink } from "../models/PaymentLink";

export interface ListTransactionsParams {
  status?: PaymentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListTransactionsResult {
  rows: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listTransactions(params: ListTransactionsParams = {}): Promise<ListTransactionsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
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
      ],
    });
  }
  const where = conditions.length ? { [Op.and]: conditions } : {};

  const { rows, count } = await Payment.findAndCountAll({
    where,
    include: [
      {
        model: Booking,
        as: "booking",
        attributes: ["id", "bookingRef", "type"],
        include: [{ model: Customer, as: "customer", attributes: ["id", "name", "email"] }],
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

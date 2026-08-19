import { Op, fn, col, literal, type WhereOptions } from "sequelize";
import { sequelize } from "../lib/db/sequelize";
import "../models/associations";
import { Booking, type BookingType, type BookingStatus } from "../models/Booking";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Passenger } from "../models/Passenger";
import { FlightDetail } from "../models/FlightDetail";
import { HotelDetail } from "../models/HotelDetail";
import { CarDetail } from "../models/CarDetail";
import { FlightSegment } from "../models/FlightSegment";
import { BookingFare } from "../models/BookingFare";
import { TicketAuthorization } from "../models/TicketAuthorization";
import { PaymentLink } from "../models/PaymentLink";
import { Payment } from "../models/Payment";
import { RiskEngineSubmission } from "../models/RiskEngineSubmission";
import { BookingDocument } from "../models/BookingDocument";
import { Invoice } from "../models/Invoice";

export interface ListBookingsParams {
  q?: string;
  type?: BookingType;
  page?: number;
  pageSize?: number;
}

export interface ListBookingsResult {
  rows: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getBookingType(bookingId: number): Promise<BookingType | null> {
  const booking = await Booking.findByPk(bookingId, { attributes: ["type"] });
  return booking?.type ?? null;
}

export async function listBookings(params: ListBookingsParams = {}): Promise<ListBookingsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 10;
  const q = params.q?.trim();

  const conditions: WhereOptions[] = [];
  if (params.type) conditions.push({ type: params.type });
  if (q) {
    // `$assoc.x$` is emitted as a raw column reference — Sequelize does not map the
    // model attribute to its `field`, so these must be the snake_case DB columns.
    conditions.push({
      [Op.or]: [
        { bookingRef: { [Op.like]: `%${q}%` } },
        { "$customer.name$": { [Op.like]: `%${q}%` } },
        { "$customer.email$": { [Op.like]: `%${q}%` } },
        { "$flightDetail.pnr$": { [Op.like]: `%${q}%` } },
        { "$hotelDetail.hotel_name$": { [Op.like]: `%${q}%` } },
        { "$hotelDetail.confirmation_no$": { [Op.like]: `%${q}%` } },
        { "$carDetail.supplier_ref$": { [Op.like]: `%${q}%` } },
        { "$carDetail.vehicle_name$": { [Op.like]: `%${q}%` } },
      ],
    });
  }
  const where = conditions.length ? { [Op.and]: conditions } : {};

  const { rows, count } = await Booking.findAndCountAll({
    where,
    include: [
      { model: Customer, as: "customer" },
      { model: User, as: "agent" },
      { model: FlightDetail, as: "flightDetail" },
      { model: HotelDetail, as: "hotelDetail" },
      { model: CarDetail, as: "carDetail" },
    ],
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    subQuery: false,
    distinct: true,
  });

  return { rows, total: count, page, pageSize };
}

/**
 * Payment state of a booking as shown on the combined bookings view. A booking can accumulate
 * several payment rows (retries after a decline, part payments), so these are precedence buckets
 * over the whole set rather than the status of any single row: a booking counts as `success` the
 * moment one payment succeeds, regardless of how many failed attempts came before it.
 * `derivePaymentSnapshot` applies the same precedence when picking the row to display.
 */
export type PaymentStatusFilter = "success" | "pending" | "failed" | "none";

export const PAYMENT_STATUS_FILTER_LABEL: Record<PaymentStatusFilter, string> = {
  success: "Paid",
  pending: "Pending",
  failed: "Failed",
  none: "No payment",
};

export interface ListAllBookingsParams {
  q?: string;
  /** Booking types this session may see — derived from `flights.view` / `hotels.view` / `cars.view`. */
  types?: BookingType[];
  type?: BookingType;
  status?: BookingStatus;
  paymentStatus?: PaymentStatusFilter;
  /** Booking (created) date range, inclusive, as `YYYY-MM-DD`. */
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AllBookingsTotals {
  count: number;
  totalAmount: number;
  mcoAmount: number;
}

export interface ListAllBookingsResult {
  rows: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totals: AllBookingsTotals;
}

/** `booking_id`s having at least one payment in `status` — used as an `IN` / `NOT IN` subquery. */
function bookingIdsWithPayment(status?: "success" | "pending" | "failed") {
  const where = status ? ` WHERE status = ${sequelize.escape(status)}` : "";
  return literal(`(SELECT booking_id FROM payments${where})`);
}

function buildAllBookingsWhere(params: ListAllBookingsParams): WhereOptions {
  const conditions: WhereOptions[] = [];
  const q = params.q?.trim();

  if (params.types) conditions.push({ type: { [Op.in]: params.types } });
  if (params.type) conditions.push({ type: params.type });
  if (params.status) conditions.push({ status: params.status });
  if (params.from) conditions.push({ createdAt: { [Op.gte]: new Date(`${params.from}T00:00:00`) } });
  if (params.to) conditions.push({ createdAt: { [Op.lte]: new Date(`${params.to}T23:59:59.999`) } });

  if (params.paymentStatus === "success") {
    conditions.push({ id: { [Op.in]: bookingIdsWithPayment("success") } });
  } else if (params.paymentStatus === "pending") {
    conditions.push({ id: { [Op.notIn]: bookingIdsWithPayment("success") } });
    conditions.push({ id: { [Op.in]: bookingIdsWithPayment("pending") } });
  } else if (params.paymentStatus === "failed") {
    conditions.push({ id: { [Op.notIn]: bookingIdsWithPayment("success") } });
    conditions.push({ id: { [Op.notIn]: bookingIdsWithPayment("pending") } });
    conditions.push({ id: { [Op.in]: bookingIdsWithPayment("failed") } });
  } else if (params.paymentStatus === "none") {
    conditions.push({ id: { [Op.notIn]: bookingIdsWithPayment() } });
  }

  if (q) {
    const like = sequelize.escape(`%${q}%`);
    conditions.push({
      [Op.or]: [
        // `$assoc.x$` is emitted as a raw column reference — see the note in `listBookings`.
        { bookingRef: { [Op.like]: `%${q}%` } },
        { "$customer.name$": { [Op.like]: `%${q}%` } },
        { "$customer.email$": { [Op.like]: `%${q}%` } },
        { "$flightDetail.pnr$": { [Op.like]: `%${q}%` } },
        { "$hotelDetail.hotel_name$": { [Op.like]: `%${q}%` } },
        { "$hotelDetail.confirmation_no$": { [Op.like]: `%${q}%` } },
        { "$carDetail.supplier_ref$": { [Op.like]: `%${q}%` } },
        { "$carDetail.vehicle_name$": { [Op.like]: `%${q}%` } },
        // Payments/links are loaded with `separate: true`, so their columns aren't joined into this
        // query and can't be matched with `$assoc.x$` — match them through a subquery instead.
        { id: { [Op.in]: literal(`(SELECT booking_id FROM payment_links WHERE gateway_link_id LIKE ${like})`) } },
        {
          id: {
            [Op.in]: literal(
              `(SELECT booking_id FROM payments WHERE transaction_id LIKE ${like} OR gateway_reference_number LIKE ${like})`
            ),
          },
        },
      ],
    });
  }

  return conditions.length ? { [Op.and]: conditions } : {};
}

/** Joins the `q` filter reaches into. Kept identical between the page query and the totals query. */
function allBookingsSearchIncludes() {
  return [
    { model: Customer, as: "customer", required: false },
    { model: FlightDetail, as: "flightDetail", required: false },
    { model: HotelDetail, as: "hotelDetail", required: false },
    { model: CarDetail, as: "carDetail", required: false },
  ];
}

/**
 * Every booking type on one screen, with the payment side (PayGlocal gid, status, paid-at) attached.
 * Payments and payment links are fetched with `separate: true` — joining these one-to-many relations
 * would multiply booking rows and corrupt both the page window and the count.
 */
export async function listAllBookings(params: ListAllBookingsParams = {}): Promise<ListAllBookingsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
  const where = buildAllBookingsWhere(params);

  const [{ rows, count }, totalsRow] = await Promise.all([
    Booking.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer" },
        // `roleRecord` is a belongsTo on both hops, so this nesting can't multiply booking rows.
        { model: User, as: "agent", include: [{ model: Role, as: "roleRecord" }] },
        { model: FlightDetail, as: "flightDetail" },
        { model: HotelDetail, as: "hotelDetail" },
        { model: CarDetail, as: "carDetail" },
        { model: PaymentLink, as: "paymentLinks", separate: true, order: [["createdAt", "DESC"]] },
        { model: Payment, as: "payments", separate: true, order: [["createdAt", "DESC"]] },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      subQuery: false,
      distinct: true,
    }),
    Booking.findOne({
      where,
      attributes: [
        [fn("COUNT", literal("DISTINCT `Booking`.`id`")), "count"],
        [fn("SUM", col("Booking.total_amount")), "totalAmount"],
        [fn("SUM", col("Booking.mco_amount")), "mcoAmount"],
      ],
      include: allBookingsSearchIncludes().map((i) => ({ ...i, attributes: [] })),
      raw: true,
      subQuery: false,
    }) as unknown as Promise<{ count: number; totalAmount: string | null; mcoAmount: string | null } | null>,
  ]);

  return {
    rows,
    total: count,
    page,
    pageSize,
    totals: {
      count: Number(totalsRow?.count ?? 0),
      totalAmount: Number(totalsRow?.totalAmount ?? 0),
      mcoAmount: Number(totalsRow?.mcoAmount ?? 0),
    },
  };
}

export interface PaymentSnapshot {
  status: PaymentStatusFilter;
  /** PayGlocal's `gid` — stored on the payment as `transaction_id`, on the link as `gateway_link_id`. */
  gid: string | null;
  paidAt: Date | null;
  amountPaid: string | null;
  currency: string | null;
  /** Raw gateway status string (e.g. `SENT_FOR_CAPTURE`), when the webhook payload carried one. */
  gatewayStatus: string | null;
}

/**
 * Collapses a booking's payments + payment links into the single row the combined view shows.
 * Precedence matches the `paymentStatus` filter buckets so filtering and display never disagree.
 */
export function derivePaymentSnapshot(booking: Booking): PaymentSnapshot {
  const payments = booking.payments ?? [];
  const links = booking.paymentLinks ?? [];
  const byRecency = [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const chosen =
    byRecency.find((p) => p.status === "success") ??
    byRecency.find((p) => p.status === "pending") ??
    byRecency.find((p) => p.status === "failed") ??
    null;

  const raw = (chosen?.gatewayResponse ?? null) as Record<string, unknown> | null;
  const rawString = (key: string): string | null => {
    const value = raw?.[key];
    return typeof value === "string" && value ? value : null;
  };

  const linkGid = links.find((l) => l.gatewayLinkId)?.gatewayLinkId ?? null;

  return {
    status: chosen ? chosen.status : "none",
    gid: chosen?.transactionId ?? rawString("gid") ?? linkGid,
    paidAt: chosen?.paidAt ?? null,
    amountPaid: chosen?.amountPaid ?? null,
    currency: chosen?.currency ?? null,
    gatewayStatus: rawString("status"),
  };
}

export async function getBookingWorkspace(bookingId: number) {
  return Booking.findByPk(bookingId, {
    include: [
      { model: Customer, as: "customer" },
      { model: User, as: "agent" },
      { model: Passenger, as: "passengers", separate: true },
      { model: FlightDetail, as: "flightDetail" },
      { model: HotelDetail, as: "hotelDetail" },
      { model: CarDetail, as: "carDetail" },
      { model: FlightSegment, as: "segments", separate: true, order: [["sequence", "ASC"]] },
      { model: BookingFare, as: "fares", separate: true },
      { model: TicketAuthorization, as: "ticketAuthorization" },
      { model: PaymentLink, as: "paymentLinks", separate: true, order: [["createdAt", "DESC"]] },
      { model: Payment, as: "payments", separate: true, order: [["createdAt", "DESC"]] },
      { model: RiskEngineSubmission, as: "riskEngineSubmissions", separate: true, order: [["createdAt", "DESC"]] },
      {
        model: BookingDocument,
        as: "documents",
        separate: true,
        order: [["uploadedAt", "DESC"]],
        include: [{ model: User, as: "uploader" }],
      },
      { model: Invoice, as: "invoices", separate: true, order: [["generatedAt", "DESC"]] },
    ],
  });
}

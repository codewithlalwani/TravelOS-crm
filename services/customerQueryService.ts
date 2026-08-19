import { Op, fn, col } from "sequelize";
import { Customer } from "../models/Customer";
import { Booking } from "../models/Booking";

export interface CustomerWithBookingCount {
  customer: Customer;
  bookingsCount: number;
}

export interface ListCustomersParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCustomersResult {
  rows: CustomerWithBookingCount[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listCustomers(params: ListCustomersParams = {}): Promise<ListCustomersResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 10;
  const q = params.q?.trim();

  const where = q
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
      }
    : {};

  const { rows: customers, count } = await Customer.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const customerIds = customers.map((c) => c.id);
  const counts = customerIds.length
    ? ((await Booking.findAll({
        attributes: ["customerId", [fn("COUNT", col("id")), "count"]],
        where: { customerId: customerIds },
        group: ["customerId"],
        raw: true,
      })) as unknown as Array<{ customerId: number; count: string }>)
    : [];
  const countByCustomerId = new Map(counts.map((c) => [c.customerId, Number(c.count)]));

  const rows = customers.map((customer) => ({
    customer,
    bookingsCount: countByCustomerId.get(customer.id) || 0,
  }));

  return { rows, total: count, page, pageSize };
}

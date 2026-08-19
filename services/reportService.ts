import { Op, type WhereOptions } from "sequelize";
import "../models/associations";
import { Booking } from "../models/Booking";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { getHistoricalUsdRate } from "../lib/currency/historicalUsdRate";

export interface ReportFilters {
  from?: string;
  to?: string;
  agentId?: number;
}

export interface AgentPerformance {
  agentId: number;
  agent: string;
  managedBy: string;
  bookings: number;
  mcoUsd: number;
}

export interface ReportsData {
  bookings: Booking[];
  performance: AgentPerformance[];
  totalMcoUsd: number;
  mcoUsdByBookingId: Record<number, number | null>;
  unavailableConversionCount: number;
}

/** Loads the spreadsheet-style report in one query, then derives its two summaries in memory. */
export async function getReportsData(filters: ReportFilters = {}): Promise<ReportsData> {
  const conditions: WhereOptions[] = [];
  if (filters.agentId) conditions.push({ agentId: filters.agentId });
  if (filters.from) conditions.push({ createdAt: { [Op.gte]: new Date(filters.from.includes("T") ? filters.from : `${filters.from}T00:00:00`) } });
  if (filters.to) conditions.push({ createdAt: { [Op.lte]: new Date(filters.to.includes("T") ? filters.to : `${filters.to}T23:59:59.999`) } });

  const [bookings, activeAgents] = await Promise.all([
    Booking.findAll({
      where: conditions.length ? { [Op.and]: conditions } : {},
      include: [
        { model: Customer, as: "customer", attributes: ["name", "phone", "email"] },
        { model: User, as: "agent", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    }),
    User.findAll({
      where: { isActive: true, ...(filters.agentId ? { id: filters.agentId } : {}) },
      attributes: ["id", "name"],
      include: [
        { model: Role, as: "roleRecord", attributes: [], where: { key: { [Op.in]: ["agent", "manager"] } } },
        { model: User, as: "creator", attributes: ["id", "name"], required: false },
      ],
      order: [["name", "ASC"]],
    }),
  ]);

  const performanceMap = new Map<number, AgentPerformance>();
  const mcoUsdByBookingId: Record<number, number | null> = {};

  for (const agent of activeAgents) {
    performanceMap.set(agent.id, {
      agentId: agent.id,
      agent: agent.name,
      managedBy: agent.creator?.name ?? "Not assigned",
      bookings: 0,
      mcoUsd: 0,
    });
  }

  const convertedBookings = await Promise.all(bookings.map(async (booking) => {
    const currency = booking.currency?.toUpperCase() || "USD";
    const bookingDate = booking.createdAt.toISOString().slice(0, 10);
    const rate = await getHistoricalUsdRate(currency, bookingDate);
    return { booking, mcoUsd: rate === null ? null : (Number(booking.mcoAmount) || 0) * rate };
  }));

  for (const { booking, mcoUsd } of convertedBookings) {
    mcoUsdByBookingId[booking.id] = mcoUsd;

    const current = performanceMap.get(booking.agentId) ?? {
      agentId: booking.agentId,
      agent: booking.agent?.name ?? "Unknown",
      managedBy: "Not assigned",
      bookings: 0,
      mcoUsd: 0,
    };
    current.bookings += 1;
    if (mcoUsd !== null) current.mcoUsd += mcoUsd;
    performanceMap.set(booking.agentId, current);
  }

  const convertedValues = Object.values(mcoUsdByBookingId);

  return {
    bookings,
    totalMcoUsd: convertedValues.reduce<number>((total, value) => total + (value ?? 0), 0),
    mcoUsdByBookingId,
    unavailableConversionCount: convertedValues.filter((value) => value === null).length,
    performance: [...performanceMap.values()].sort(
      (a, b) => b.bookings - a.bookings || a.agent.localeCompare(b.agent)
    ),
  };
}

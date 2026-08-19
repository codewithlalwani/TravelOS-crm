import { Op, fn, col, literal } from "sequelize";
import { Booking, BOOKING_STATUS_ORDER, type BookingStatus } from "../models/Booking";
import { User } from "../models/User";

export interface DashboardData {
  totalUsers: number;
  totalBookings: number;
  bookingsToday: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  revenueByCurrency: Array<{ currency: string; total: number }>;
  statusBreakdown: Array<{ status: BookingStatus; count: number }>;
  topAgents: Array<{ name: string; count: number }>;
  dailyBookings: Array<{ date: string; count: number }>;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [totalUsers, totalBookings, bookingsToday, bookingsThisWeek, bookingsThisMonth] = await Promise.all([
    User.count(),
    Booking.count(),
    Booking.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
    Booking.count({ where: { createdAt: { [Op.gte]: weekStart } } }),
    Booking.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
  ]);

  const revenueRows = (await Booking.findAll({
    attributes: ["currency", [fn("SUM", col("total_amount")), "total"]],
    where: { totalAmount: { [Op.ne]: null } },
    group: ["currency"],
    raw: true,
  })) as unknown as Array<{ currency: string; total: string | null }>;
  const revenueByCurrency = revenueRows
    .map((r) => ({ currency: r.currency, total: Number(r.total) || 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);

  const statusRows = (await Booking.findAll({
    attributes: ["status", [fn("COUNT", col("id")), "count"]],
    group: ["status"],
    raw: true,
  })) as unknown as Array<{ status: BookingStatus; count: string }>;
  const countByStatus = new Map(statusRows.map((r) => [r.status, Number(r.count)]));
  const statusBreakdown = BOOKING_STATUS_ORDER.map((status) => ({
    status,
    count: countByStatus.get(status) || 0,
  }));

  const agentRows = (await Booking.findAll({
    attributes: ["agentId", [fn("COUNT", col("id")), "count"]],
    group: ["agentId"],
    order: [[literal("count"), "DESC"]],
    limit: 5,
    raw: true,
  })) as unknown as Array<{ agentId: number; count: string }>;
  const agents = await User.findAll({ where: { id: agentRows.map((r) => r.agentId) }, attributes: ["id", "name"] });
  const nameByAgentId = new Map(agents.map((a) => [a.id, a.name]));
  const topAgents = agentRows.map((r) => ({
    name: nameByAgentId.get(r.agentId) || "Unknown",
    count: Number(r.count),
  }));

  const dailyRows = (await Booking.findAll({
    attributes: [[fn("DATE", col("created_at")), "day"], [fn("COUNT", col("id")), "count"]],
    where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    group: [fn("DATE", col("created_at"))],
    raw: true,
  })) as unknown as Array<{ day: string; count: string }>;
  const countByDay = new Map(dailyRows.map((r) => [String(r.day).slice(0, 10), Number(r.count)]));
  const dailyBookings: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyBookings.push({ date: key, count: countByDay.get(key) || 0 });
  }

  return {
    totalUsers,
    totalBookings,
    bookingsToday,
    bookingsThisWeek,
    bookingsThisMonth,
    revenueByCurrency,
    statusBreakdown,
    topAgents,
    dailyBookings,
  };
}

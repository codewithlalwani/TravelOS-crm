import { Op } from "sequelize";
import { LoginHistory } from "../models/LoginHistory";

export async function createLoginHistory(params: {
  userId?: number | null;
  ipAddress: string | null;
  loginId: string;
  loginStatus: boolean;
  ipCountry?: string | null;
  ipCity?: string | null;
  failureReason?: string | null;
}) {
  return LoginHistory.create({
    userId: params.userId ?? null,
    ipAddress: params.ipAddress,
    loginId: params.loginId,
    loginStatus: params.loginStatus,
    ipCountry: params.ipCountry ?? null,
    ipCity: params.ipCity ?? null,
    failureReason: params.failureReason ?? null,
  });
}

export async function closeLoginHistory(historyId: number, userId: number) {
  await LoginHistory.update(
    { logoutTime: new Date() },
    { where: { id: historyId, userId, loginStatus: true, logoutTime: null } }
  );
}

export async function listLoginHistories(params: { q?: string; status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
  const where: Record<string | symbol, unknown> = {};
  const q = params.q?.trim();
  if (q) {
    where[Op.or] = [
      { loginId: { [Op.like]: `%${q}%` } },
      { ipAddress: { [Op.like]: `%${q}%` } },
      { ipCountry: { [Op.like]: `%${q}%` } },
      { ipCity: { [Op.like]: `%${q}%` } },
    ];
  }
  if (params.status === "success") where.loginStatus = true;
  if (params.status === "failed") where.loginStatus = false;

  const { rows, count } = await LoginHistory.findAndCountAll({
    where,
    order: [["loginTime", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { rows, total: count, page, pageSize };
}

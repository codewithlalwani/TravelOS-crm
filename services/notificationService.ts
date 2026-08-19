import { Op } from "sequelize";
import "../models/associations";
import { AdminNotification, type LoginNotificationDetails } from "../models/AdminNotification";
import { Role } from "../models/Role";
import { User } from "../models/User";

export interface NotificationDto {
  id: number;
  title: string;
  message: string;
  details: LoginNotificationDetails | null;
  readAt: string | null;
  createdAt: string;
}

export async function notifyAdminsOfLogin(params: {
  actorUserId: number;
  name: string;
  email: string;
  role: string;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  loginTime: Date;
}) {
  const admins = await User.findAll({
    where: { isActive: true },
    attributes: ["id"],
    include: [{ model: Role, as: "roleRecord", where: { key: { [Op.in]: ["admin", "manager"] } }, attributes: [] }],
  });
  if (admins.length === 0) return;

  const details: LoginNotificationDetails = {
    name: params.name,
    email: params.email,
    role: params.role,
    ipAddress: params.ipAddress,
    location: params.location,
    userAgent: params.userAgent,
    loginTime: params.loginTime.toISOString(),
  };
  await AdminNotification.bulkCreate(admins.map((admin) => ({
    recipientUserId: admin.id,
    actorUserId: params.actorUserId,
    type: "user_login",
    title: "User signed in",
    message: `${params.name} (${params.email}) signed in`,
    details,
  })));
}

export async function listNotifications(userId: number, limit = 12) {
  const [rows, unreadCount] = await Promise.all([
    AdminNotification.findAll({ where: { recipientUserId: userId }, order: [["createdAt", "DESC"]], limit }),
    AdminNotification.count({ where: { recipientUserId: userId, readAt: { [Op.is]: null } } }),
  ]);
  return {
    unreadCount,
    notifications: rows.map((row): NotificationDto => ({
      id: row.id,
      title: row.title,
      message: row.message,
      details: row.details,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function markNotificationRead(userId: number, notificationId: number) {
  await AdminNotification.update({ readAt: new Date() }, { where: { id: notificationId, recipientUserId: userId, readAt: { [Op.is]: null } } });
}

export async function markAllNotificationsRead(userId: number) {
  await AdminNotification.update({ readAt: new Date() }, { where: { recipientUserId: userId, readAt: { [Op.is]: null } } });
}

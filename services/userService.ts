import { Op, fn, col } from "sequelize";
import "../models/associations";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Booking } from "../models/Booking";
import { hashPassword } from "../lib/auth/password";
import { UserAccessLocation } from "../models/UserAccessLocation";
import { sequelize } from "../lib/db/sequelize";

export interface AccessLocationInput {
  label: string;
  placeId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

async function assertReportingManager(userId: number | null) {
  if (!userId) throw new Error("A reporting manager is required");
  const manager = await User.findOne({
    where: { id: userId, isActive: true },
    include: [{ model: Role, as: "roleRecord", where: { key: { [Op.in]: ["manager", "admin"] } } }],
  });
  if (!manager) throw new Error("Select an active Manager or Admin as the reporting manager");
}

export async function createUser(params: {
  name: string;
  email: string;
  password: string;
  roleId: number;
  accessLocation: string | null;
  accessPlaceId: string | null;
  accessLatitude: number | null;
  accessLongitude: number | null;
  accessRadiusKm: number;
  createdBy: number | null;
}) {
  await assertReportingManager(params.createdBy);
  const existing = await User.findOne({ where: { email: params.email } });
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await hashPassword(params.password);
  return User.create({
    name: params.name,
    email: params.email,
    passwordHash,
    roleId: params.roleId,
    accessLocation: params.accessLocation,
    accessPlaceId: params.accessPlaceId,
    accessLatitude: params.accessLatitude,
    accessLongitude: params.accessLongitude,
    accessRadiusKm: params.accessRadiusKm,
    createdBy: params.createdBy,
  });
}

export async function findUserById(userId: number) {
  return User.findByPk(userId, {
    include: [
      { model: Role, as: "roleRecord" },
      { model: User, as: "creator", include: [{ model: Role, as: "roleRecord" }] },
      { model: UserAccessLocation, as: "accessLocations" },
    ],
  });
}

export async function updateUser(
  userId: number,
  params: {
    name: string;
    email: string;
    password?: string;
    roleId: number;
    accessLocation: string | null;
    accessPlaceId: string | null;
    accessLatitude: number | null;
    accessLongitude: number | null;
    accessRadiusKm: number;
    createdBy: number | null;
  }
) {
  await assertReportingManager(params.createdBy);
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  const duplicate = await User.findOne({
    where: { email: params.email, id: { [Op.ne]: userId } },
  });
  if (duplicate) throw new Error("A user with this email already exists");

  user.name = params.name;
  user.email = params.email;
  user.roleId = params.roleId;
  user.accessLocation = params.accessLocation;
  user.accessPlaceId = params.accessPlaceId;
  user.accessLatitude = params.accessLatitude;
  user.accessLongitude = params.accessLongitude;
  user.accessRadiusKm = params.accessRadiusKm;
  user.createdBy = params.createdBy;
  if (params.password) user.passwordHash = await hashPassword(params.password);
  return user.save();
}

export async function findUserByEmail(email: string) {
  return User.findOne({
    where: { email },
    include: [
      { model: Role, as: "roleRecord" },
      { model: User, as: "creator", include: [{ model: Role, as: "roleRecord" }] },
      { model: UserAccessLocation, as: "accessLocations" },
    ],
  });
}

export async function replaceUserAccessLocations(userId: number, locations: AccessLocationInput[]) {
  await sequelize.transaction(async (transaction) => {
    await UserAccessLocation.destroy({ where: { userId }, transaction });
    await UserAccessLocation.bulkCreate(
      locations.map((location) => ({ userId, ...location })),
      { transaction }
    );
  });
}

export async function listActiveUsersWithRoles() {
  return User.findAll({
    where: { isActive: true },
    include: [{ model: Role, as: "roleRecord" }],
    order: [["name", "ASC"]],
  });
}

export async function listActiveReportingManagers() {
  return User.findAll({
    where: { isActive: true },
    include: [{ model: Role, as: "roleRecord", where: { key: { [Op.in]: ["manager", "admin"] } } }],
    order: [["name", "ASC"]],
  });
}

export interface UserWithBookingCount {
  user: User;
  bookingsCreated: number;
}

export interface ListUsersParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListUsersResult {
  rows: UserWithBookingCount[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUsersByBookingsCreated(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 10;
  const q = params.q?.trim();

  const where = q
    ? { [Op.or]: [{ name: { [Op.like]: `%${q}%` } }, { email: { [Op.like]: `%${q}%` } }] }
    : {};

  const users = await User.findAll({
    where,
    order: [["createdAt", "ASC"]],
    include: [
      { model: Role, as: "roleRecord" },
      { model: User, as: "creator", include: [{ model: Role, as: "roleRecord" }] },
      { model: UserAccessLocation, as: "accessLocations" },
    ],
  });

  const counts = (await Booking.findAll({
    attributes: ["agentId", [fn("COUNT", col("id")), "count"]],
    group: ["agentId"],
    raw: true,
  })) as unknown as Array<{ agentId: number; count: string }>;
  const countByUserId = new Map(counts.map((c) => [c.agentId, Number(c.count)]));

  const sorted = users
    .map((user) => ({ user, bookingsCreated: countByUserId.get(user.id) || 0 }))
    .sort((a, b) => b.bookingsCreated - a.bookingsCreated);

  const start = (page - 1) * pageSize;
  return { rows: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize };
}

export async function setUserActive(userId: number, isActive: boolean) {
  await User.update({ isActive }, { where: { id: userId } });
}

export async function setUserTwoFactorEnabled(userId: number, enabled: boolean) {
  const [updated] = await User.update(
    { twoFactorEnabled: enabled },
    { where: { id: userId, isActive: true } },
  );
  if (updated !== 1) throw new Error("User not found or inactive");
}

export async function recordUserLoginLocation(
  userId: number,
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    ipLatitude: number | null;
    ipLongitude: number | null;
    method: "gps" | "ip";
    distanceKm: number;
  }
) {
  await User.update(
    {
      lastLoginLatitude: location.latitude,
      lastLoginLongitude: location.longitude,
      lastLoginAccuracy: location.accuracy,
      lastLoginLocationAt: new Date(),
      lastLoginIpLatitude: location.ipLatitude,
      lastLoginIpLongitude: location.ipLongitude,
      lastLoginLocationMethod: location.method,
      lastLoginDistanceKm: location.distanceKm,
    },
    { where: { id: userId } }
  );
}

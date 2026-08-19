import { headers } from "next/headers";
import { isIP } from "node:net";
import "../models/associations";
import { AuditLog, type AuditEventType } from "../models/AuditLog";
import { User } from "../models/User";
import { Booking } from "../models/Booking";
import { isPrivateIp } from "../lib/geo/geofence";

function normalizeIp(value: string): string | null {
  let candidate = value.trim().replace(/^for=/i, "").replace(/^"|"$/g, "");
  const bracketedIpv6 = candidate.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6) candidate = bracketedIpv6[1];
  if (candidate.startsWith("::ffff:")) candidate = candidate.slice(7);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.replace(/:\d+$/, "");
  }
  return isIP(candidate) ? candidate : null;
}

export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const candidates = [
    h.get("cf-connecting-ip"),
    h.get("true-client-ip"),
    h.get("x-vercel-forwarded-for"),
    h.get("x-forwarded-for"),
    h.get("x-real-ip"),
    h.get("forwarded")?.split(";").find((part) => part.trim().toLowerCase().startsWith("for=")),
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map(normalizeIp)
    .filter((value): value is string => value !== null);

  // Some local/reverse proxies put their own loopback address before the actual
  // client. Prefer the first public address, but retain a private address when
  // the request truly originated on the local network.
  return candidates.find((ip) => !isPrivateIp(ip)) ?? candidates[0] ?? null;
}

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  description: string;
  actorId?: number | null;
  actorEmail?: string | null;
  targetUserId?: number | null;
  bookingId?: number | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return AuditLog.create({
    eventType: params.eventType,
    description: params.description,
    actorId: params.actorId ?? null,
    actorEmail: params.actorEmail ?? null,
    targetUserId: params.targetUserId ?? null,
    bookingId: params.bookingId ?? null,
    ipAddress: params.ipAddress ?? null,
    metadata: params.metadata ?? null,
  });
}

export interface ListAuditLogsParams {
  eventType?: AuditEventType;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListAuditLogsResult {
  rows: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<ListAuditLogsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = params.pageSize || 20;
  const where: Record<string, unknown> = {};
  if (params.eventType) where.eventType = params.eventType;

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [
      { model: User, as: "actor", attributes: ["id", "name", "email"] },
      { model: User, as: "targetUser", attributes: ["id", "name", "email"] },
      { model: Booking, as: "booking", attributes: ["id", "bookingRef"] },
    ],
    order: [["occurredAt", "DESC"]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return { rows, total: count, page, pageSize };
}

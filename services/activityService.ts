import { Op } from "sequelize";
import "../models/associations";
import { ActivityTimelineEntry, type ActivityEventType } from "../models/ActivityTimelineEntry";
import { User } from "../models/User";
import { Role } from "../models/Role";

const VIEW_THROTTLE_MS = 5 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 15;

export interface ListActivityTimelineResult {
  rows: ActivityTimelineEntry[];
  total: number;
  page: number;
  pageSize: number;
}

/** Most recent event first. */
export async function listActivityTimeline(
  bookingId: number,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ListActivityTimelineResult> {
  const currentPage = Math.max(1, page);
  const { rows, count } = await ActivityTimelineEntry.findAndCountAll({
    where: { bookingId },
    include: [{ model: User, as: "actor" }],
    order: [["occurredAt", "DESC"]],
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  return { rows, total: count, page: currentPage, pageSize };
}

async function actorSnapshot(actorId: number | null): Promise<{ actorEmail: string | null; actorRole: string | null }> {
  if (actorId == null) return { actorEmail: null, actorRole: null };
  const user = await User.findByPk(actorId, { include: [{ model: Role, as: "roleRecord" }] });
  return { actorEmail: user?.email ?? null, actorRole: user?.roleRecord?.name ?? null };
}

export async function logActivity(
  bookingId: number,
  eventType: ActivityEventType,
  description: string,
  actorId: number | null
) {
  const { actorEmail, actorRole } = await actorSnapshot(actorId);
  return ActivityTimelineEntry.create({ bookingId, eventType, description, actorId, actorEmail, actorRole });
}

/** Logs a "booking_viewed" entry, throttled per actor/booking so tab navigation doesn't flood the timeline. */
export async function logBookingView(bookingId: number, actorId: number | null) {
  if (actorId == null) return;

  const recent = await ActivityTimelineEntry.findOne({
    where: {
      bookingId,
      actorId,
      eventType: "booking_viewed",
      occurredAt: { [Op.gte]: new Date(Date.now() - VIEW_THROTTLE_MS) },
    },
    order: [["occurredAt", "DESC"]],
  });
  if (recent) return;

  const { actorEmail, actorRole } = await actorSnapshot(actorId);
  await ActivityTimelineEntry.create({
    bookingId,
    eventType: "booking_viewed",
    description: "Booking viewed",
    actorId,
    actorEmail,
    actorRole,
  });
}

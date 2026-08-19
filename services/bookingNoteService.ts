import "../models/associations";
import { BookingNote } from "../models/BookingNote";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { logActivity } from "./activityService";
import { logAuditEvent } from "./auditLogService";

const DEFAULT_PAGE_SIZE = 10;

export interface ListBookingNotesResult {
  rows: BookingNote[];
  total: number;
  page: number;
  pageSize: number;
}

/** Most recently touched note first — an edit bumps a note back to the top, same as a fresh one. */
export async function listBookingNotes(
  bookingId: number,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<ListBookingNotesResult> {
  const currentPage = Math.max(1, page);
  const { rows, count } = await BookingNote.findAndCountAll({
    where: { bookingId },
    include: [
      { model: User, as: "author", include: [{ model: Role, as: "roleRecord" }] },
      { model: User, as: "editor", include: [{ model: Role, as: "roleRecord" }] },
    ],
    order: [["updatedAt", "DESC"]],
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  return { rows, total: count, page: currentPage, pageSize };
}

export async function addBookingNote(
  bookingId: number,
  content: string,
  actorId: number,
  actorEmail: string
): Promise<BookingNote> {
  const note = await BookingNote.create({ bookingId, content, createdBy: actorId, updatedBy: null });
  await logActivity(bookingId, "note_added", "Note added", actorId);
  await logAuditEvent({ eventType: "note_added", description: "Note added", actorId, actorEmail, bookingId });
  return note;
}

export async function updateBookingNote(
  noteId: number,
  content: string,
  actorId: number,
  actorEmail: string,
  isAdmin: boolean
): Promise<BookingNote> {
  const note = await BookingNote.findByPk(noteId);
  if (!note) throw new Error("Note not found");
  if (note.createdBy !== actorId && !isAdmin) throw new Error("You can only edit your own notes");

  await note.update({ content, updatedBy: actorId });
  await logActivity(note.bookingId, "note_updated", "Note updated", actorId);
  await logAuditEvent({
    eventType: "note_updated",
    description: "Note updated",
    actorId,
    actorEmail,
    bookingId: note.bookingId,
  });
  return note;
}

export async function deleteBookingNote(
  noteId: number,
  actorId: number,
  actorEmail: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) throw new Error("Only an admin can delete notes");

  const note = await BookingNote.findByPk(noteId);
  if (!note) throw new Error("Note not found");

  const bookingId = note.bookingId;
  await note.destroy();
  await logActivity(bookingId, "note_deleted", "Note deleted", actorId);
  await logAuditEvent({ eventType: "note_deleted", description: "Note deleted", actorId, actorEmail, bookingId });
}

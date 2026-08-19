import type { BookingNote } from "@/models/BookingNote";
import { Pagination } from "@/components/Pagination";
import { addBookingNoteAction } from "../../actions";
import { NoteItem, type NoteItemData } from "./NoteItem";

const textareaClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export function NotesTab({
  bookingId,
  notes,
  page,
  pageSize,
  total,
  currentUserId,
  isAdmin,
}: {
  bookingId: number;
  notes: BookingNote[];
  page: number;
  pageSize: number;
  total: number;
  currentUserId: number;
  isAdmin: boolean;
}) {
  const items: NoteItemData[] = notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    authorName: n.author?.name || "Unknown",
    authorRole: n.author?.roleRecord?.name || null,
    editorName: n.editor?.name || null,
    editorRole: n.editor?.roleRecord?.name || null,
    canEdit: isAdmin || n.createdBy === currentUserId,
    canDelete: isAdmin,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
        <h3 className="mb-3 font-heading text-sm font-semibold text-card-foreground">Add a note</h3>
        <form action={addBookingNoteAction} className="space-y-3">
          <input type="hidden" name="bookingId" value={bookingId} />
          <textarea
            name="content"
            required
            rows={3}
            placeholder="Leave a note for this booking…"
            className={textareaClass}
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Add Note
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-sm text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ol className="divide-y divide-border">
            {items.map((note) => (
              <NoteItem key={note.id} bookingId={bookingId} note={note} />
            ))}
          </ol>
          <Pagination
            basePath={`/bookings/${bookingId}`}
            page={page}
            pageSize={pageSize}
            total={total}
            extraParams={{ tab: "notes" }}
          />
        </div>
      )}
    </div>
  );
}

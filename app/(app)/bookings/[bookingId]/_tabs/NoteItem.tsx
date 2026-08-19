"use client";

import { useState } from "react";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { IconEdit, IconTrash } from "@/components/icons";
import { updateBookingNoteAction, deleteBookingNoteAction } from "../../actions";

const textareaClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export interface NoteItemData {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  authorRole: string | null;
  editorName: string | null;
  editorRole: string | null;
  canEdit: boolean;
  canDelete: boolean;
}

function nameWithRole(name: string, role: string | null): string {
  return role ? `${name} · ${role}` : name;
}

export function NoteItem({ bookingId, note }: { bookingId: number; note: NoteItemData }) {
  const [editing, setEditing] = useState(false);
  const wasEdited = note.updatedAt.getTime() !== note.createdAt.getTime();

  if (editing) {
    return (
      <li className="p-4">
        <form
          action={async (formData) => {
            await updateBookingNoteAction(formData);
            setEditing(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="noteId" value={note.id} />
          <textarea name="content" required rows={3} defaultValue={note.content} className={textareaClass} />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="p-4">
      <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {nameWithRole(note.authorName, note.authorRole)} · {note.createdAt.toLocaleString()}
          {wasEdited &&
            ` · edited by ${note.editorName ? nameWithRole(note.editorName, note.editorRole) : "—"} on ${note.updatedAt.toLocaleString()}`}
        </p>
        {(note.canEdit || note.canDelete) && (
          <div className="flex items-center gap-3">
            {note.canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-secondary-foreground hover:underline"
              >
                <IconEdit className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {note.canDelete && (
              <form action={deleteBookingNoteAction}>
                <input type="hidden" name="bookingId" value={bookingId} />
                <input type="hidden" name="noteId" value={note.id} />
                <ConfirmSubmitButton
                  confirmTitle="Delete this note?"
                  confirmMessage="This will permanently remove the note. This cannot be undone."
                  confirmLabel="Delete"
                  pendingLabel="Deleting…"
                  danger
                  className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  Delete
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

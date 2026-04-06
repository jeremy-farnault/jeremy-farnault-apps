"use client";

import { cn } from "@jf/ui";
import type { Folder, Note } from "@/lib/queries";
import { NoteActionsMenu } from "./note-actions-menu";

function getBorderColor(color: string): string {
  return color.replace("-400)", "-800)");
}

type Props = {
  note: Note;
  allFolders: Folder[];
  onNoteClick: (note: Note) => void;
};

export function NoteCard({ note, allFolders, onNoteClick }: Props) {
  const bgColor = note.backgroundColor ?? "var(--grey-400)";
  const borderColor = getBorderColor(bgColor);

  return (
    <div
      className={cn(
        "relative flex h-[200px] flex-col overflow-hidden rounded-[22px] border p-4",
        note.pinned
          ? "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]"
          : "shadow-sm"
      )}
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <button
        type="button"
        onClick={() => onNoteClick(note)}
        className="flex flex-1 flex-col items-start text-left overflow-hidden w-full"
      >
        {note.title && (
          <p className="mb-1 text-sm font-semibold text-(--grey-900) line-clamp-2">
            {note.title}
          </p>
        )}
        {note.body && (
          <p className="text-xs text-(--grey-700) overflow-hidden flex-1 w-full">
            {note.body}
          </p>
        )}
      </button>

      <div className="flex justify-end mt-2">
        <NoteActionsMenu note={note} allFolders={allFolders} />
      </div>
    </div>
  );
}

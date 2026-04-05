"use client";

import type { Folder, Note } from "@/lib/queries";
import { NoteActionsMenu } from "./note-actions-menu";

type Props = {
  note: Note;
  allFolders: Folder[];
  onNoteClick: (note: Note) => void;
};

export function NoteCard({ note, allFolders, onNoteClick }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", backgroundColor: note.backgroundColor ?? undefined }}>
      <button
        type="button"
        onClick={() => onNoteClick(note)}
        style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        <p>{note.pinned && <span>📌 </span>}{note.title ?? "Untitled"}</p>
        {note.body && <p>{note.body.slice(0, 100)}</p>}
      </button>
      <NoteActionsMenu note={note} allFolders={allFolders} />
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Folder, Note } from "@/lib/queries";
import { getFolderPath } from "@/lib/folder-utils";

type Props = {
  notes: Note[];
  allFolders: Folder[];
  onNoteClick: (note: Note) => void;
  isLoading: boolean;
  query: string;
};

export function SearchResults({ notes, allFolders, onNoteClick, isLoading, query }: Props) {
  if (isLoading) {
    return <p>Searching…</p>;
  }

  if (notes.length === 0) {
    return <p>No results for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div>
      {notes.map((note) => {
        const folderPath = getFolderPath(note.parentFolderId, allFolders);
        const folderHref = note.parentFolderId ? `/${note.parentFolderId}` : "/";

        return (
          <div key={note.id}>
            <button type="button" onClick={() => onNoteClick(note)} style={{ display: "block", textAlign: "left", width: "100%" }}>
              <div>{note.title ?? "Untitled"}</div>
              {note.body && <div>{note.body.slice(0, 100)}{note.body.length > 100 ? "…" : ""}</div>}
              <div>{folderPath}</div>
            </button>
            <Link href={folderHref}>Go to folder</Link>
          </div>
        );
      })}
    </div>
  );
}

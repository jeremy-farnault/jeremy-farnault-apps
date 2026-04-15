"use client";

import type { Folder, Note } from "@/lib/queries";
import { SpinnerGapIcon } from "@phosphor-icons/react";
import { NoteCard } from "./note-card";

type Props = {
  notes: Note[];
  allFolders: Folder[];
  onNoteClick: (note: Note) => void;
  onFolderLinkClick: () => void;
  isLoading: boolean;
  query: string;
};

export function SearchResults({
  notes,
  allFolders,
  onNoteClick,
  onFolderLinkClick,
  isLoading,
  query,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGapIcon size={32} className="animate-spin text-(--grey-500)" />
      </div>
    );
  }

  if (notes.length === 0) {
    return <p>No results for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          allFolders={allFolders}
          onNoteClick={onNoteClick}
          onFolderLinkClick={onFolderLinkClick}
          showFolderLink
          parentFolderId={note.parentFolderId}
        />
      ))}
    </div>
  );
}

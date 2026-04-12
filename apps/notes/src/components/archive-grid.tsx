import type { Folder, Note } from "@/lib/queries";
import type { ReactNode } from "react";
import { ArchivedFolderCard } from "./archived-folder-card";
import { ArchivedNoteCard } from "./archived-note-card";
import { EmptyState } from "./empty-state";

type Props = {
  folders: Folder[];
  notes: Note[];
  breadcrumb: ReactNode;
};

export function ArchiveGrid({ folders, notes, breadcrumb }: Props) {
  const isEmpty = folders.length === 0 && notes.length === 0;

  return (
    <div className="w-full px-4 pt-6 pb-24">
      {breadcrumb}
      {isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {folders.map((f) => (
            <ArchivedFolderCard key={f.id} folder={f} />
          ))}
          {notes.map((n) => (
            <ArchivedNoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}

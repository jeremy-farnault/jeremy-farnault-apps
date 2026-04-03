"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Folder, Note } from "@/lib/queries";
import { type SortOption, sortItems } from "@/lib/grid-utils";
import { EmptyState } from "./empty-state";
import { FolderCard } from "./folder-card";
import { NoteCard } from "./note-card";
import { NewFolderButton } from "./new-folder-button";
import { NotePanel } from "./note-panel";

type PanelState = { mode: "new" } | { mode: "existing"; note: Note };

type Props = {
  folders: Folder[];
  notes: Note[];
  sort: SortOption;
  breadcrumb: ReactNode;
  sortControl: ReactNode;
  currentFolderId: string | null;
  allFolders: Folder[];
};

export function ItemsGrid({
  folders,
  notes,
  sort,
  breadcrumb,
  sortControl,
  currentFolderId,
  allFolders,
}: Props) {
  const [panel, setPanel] = useState<PanelState | null>(null);
  const items = sortItems(folders, notes, sort);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <div>
          {breadcrumb}
          {sortControl}
          <NewFolderButton parentFolderId={currentFolderId} />
          <button type="button" onClick={() => setPanel({ mode: "new" })}>
            New note
          </button>
        </div>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {items.map((item) =>
              item.kind === "folder" ? (
                <FolderCard
                  key={item.data.id}
                  folder={item.data}
                  allFolders={allFolders}
                />
              ) : (
                <NoteCard
                  key={item.data.id}
                  note={item.data}
                  allFolders={allFolders}
                  onNoteClick={(note) => setPanel({ mode: "existing", note })}
                />
              ),
            )}
          </div>
        )}
      </div>
      {panel && (
        <NotePanel
          note={panel.mode === "existing" ? panel.note : null}
          parentFolderId={currentFolderId}
          allFolders={allFolders}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Folder, Note } from "@/lib/queries";
import { type SortOption, sortItems } from "@/lib/grid-utils";
import { searchNotesAction } from "@/lib/actions";
import { EmptyState } from "./empty-state";
import { FolderCard } from "./folder-card";
import { NoteCard } from "./note-card";
import { NewFolderButton } from "./new-folder-button";
import { NotePanel } from "./note-panel";
import { SearchResults } from "./search-results";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const items = sortItems(folders, notes, sort);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchNotesAction(searchQuery);
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <div>
          {breadcrumb}
          {sortControl}
          <input
            type="search"
            placeholder="Search notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <NewFolderButton parentFolderId={currentFolderId} />
          <button type="button" onClick={() => setPanel({ mode: "new" })}>
            New note
          </button>
          <Link href="/archive">Archive</Link>
        </div>
        {searchQuery.trim() ? (
          <SearchResults
            notes={searchResults ?? []}
            allFolders={allFolders}
            onNoteClick={(note) => setPanel({ mode: "existing", note })}
            isLoading={searchLoading}
            query={searchQuery}
          />
        ) : items.length === 0 ? (
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

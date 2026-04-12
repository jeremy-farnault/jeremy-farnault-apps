"use client";

import { searchNotesAction } from "@/lib/actions";
import { type SortOption, sortItems } from "@/lib/grid-utils";
import type { Folder, Note } from "@/lib/queries";
import { Select, SelectItem, TextInput } from "@jf/ui";
import { ArchiveIcon, FolderPlusIcon, PlusSquareIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { EmptyState } from "./empty-state";
import { FolderCard } from "./folder-card";
import { NewFolderButton } from "./new-folder-button";
import { NoteCard } from "./note-card";
import { NotePanel } from "./note-panel";
import { SearchResults } from "./search-results";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "modified-desc", label: "Last modified" },
  { value: "alpha-asc", label: "Name A–Z" },
  { value: "alpha-desc", label: "Name Z–A" },
  { value: "type", label: "Folders first" },
];

type PanelState = { mode: "new" } | { mode: "existing"; note: Note };

type Props = {
  folders: Folder[];
  notes: Note[];
  sort: SortOption;
  breadcrumb: ReactNode;
  currentFolderId: string | null;
  allFolders: Folder[];
};

export function ItemsGrid({
  folders,
  notes,
  sort,
  breadcrumb,
  currentFolderId,
  allFolders,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [panel, setPanel] = useState<PanelState | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const items = sortItems(folders, notes, sort);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchNotesAction(searchQuery);
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full px-4 pt-6 pb-24">
      {breadcrumb}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative min-w-[250px] max-w-[300px]">
          <TextInput value={searchQuery} onChange={setSearchQuery} placeholder="Search notes…" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--grey-400) hover:text-(--grey-700)"
              aria-label="Clear search"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={handleSortChange} className="w-[250px]">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
          <Link
            href="/archive"
            title="Archive"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200) hover:text-(--grey-900)"
          >
            <ArchiveIcon size={20} />
          </Link>
        </div>
      </div>

      {searchQuery.trim() ? (
        <SearchResults
          notes={searchResults ?? []}
          allFolders={allFolders}
          onNoteClick={(note) => setPanel({ mode: "existing", note })}
          onFolderLinkClick={() => setSearchQuery("")}
          isLoading={searchLoading}
          query={searchQuery}
        />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) =>
            item.kind === "folder" ? (
              <FolderCard key={item.data.id} folder={item.data} allFolders={allFolders} />
            ) : (
              <NoteCard
                key={item.data.id}
                note={item.data}
                allFolders={allFolders}
                onNoteClick={(note) => setPanel({ mode: "existing", note })}
              />
            )
          )}
        </div>
      )}

      {/* Floating CTAs */}
      <div
        className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
        style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          aria-label="New folder"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <FolderPlusIcon size={22} />
        </button>
        <button
          type="button"
          onClick={() => setPanel({ mode: "new" })}
          aria-label="New note"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
        >
          <PlusSquareIcon size={22} />
        </button>
      </div>

      {panel && (
        <NotePanel
          note={panel.mode === "existing" ? panel.note : null}
          parentFolderId={currentFolderId}
          allFolders={allFolders}
          onClose={() => setPanel(null)}
        />
      )}

      <NewFolderButton
        parentFolderId={currentFolderId}
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
      />
    </div>
  );
}

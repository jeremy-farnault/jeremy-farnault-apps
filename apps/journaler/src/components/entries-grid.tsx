"use client";

import { deleteEntryAction, fetchEntriesAction, searchEntriesAction } from "@/lib/actions";
import type { EntryCursor, FilterParams } from "@/lib/queries";
import { FloatingCTA, Grid } from "@jf/ui";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { type CardEntry, EntryCard } from "./entry-card";
import { EntryFormModal } from "./entry-form-modal";
import { FilterBar } from "./filter-bar";

type Props = {
  initialEntries: CardEntry[];
  initialNextCursor: EntryCursor | null;
  filters: FilterParams;
};

export function EntriesGrid({ initialEntries, initialNextCursor, filters }: Props) {
  // ── Infinite-scroll state ─────────────────────────────────────────────────
  const [entries, setEntries] = useState<CardEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<EntryCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<CardEntry[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CardEntry | undefined>(undefined);

  const isSearching = searchResults !== null;

  // ── Mutation handlers ─────────────────────────────────────────────────────
  function handleEntrySuccess(entry: CardEntry, isEdit: boolean) {
    if (isEdit) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
      setSearchResults((prev) => prev?.map((e) => (e.id === entry.id ? entry : e)) || null);
    } else {
      setEntries((prev) => [entry, ...prev]);
    }
  }

  function handleEntryDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSearchResults((prev) => prev?.filter((e) => e.id !== id) || null);
  }

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || loading || isSearching) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoading(true);
          fetchEntriesAction(nextCursor, filters)
            .then(({ entries: newEntries, nextCursor: newCursor }) => {
              setEntries((prev) => [...prev, ...newEntries]);
              setNextCursor(newCursor);
            })
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loading, isSearching, filters]);

  // ── Search handler ────────────────────────────────────────────────────────
  async function handleDebouncedSearch(query: string) {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchEntriesAction(query, filters);
      setSearchResults(results);
    } finally {
      setSearchLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const displayEntries = searchResults ?? entries;
  const isEmpty = displayEntries.length === 0;

  return (
    <>
      <div>
        <FilterBar filters={filters} onSearch={handleDebouncedSearch} />

        {isEmpty && !searchLoading ? (
          <div className="flex justify-center pt-16">
            <p>{isSearching ? "No results found." : "Nothing here yet."}</p>
          </div>
        ) : (
          <>
            <Grid>
              {displayEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => {
                    setEditingEntry(e);
                    setModalOpen(true);
                  }}
                  onDelete={async (e) => {
                    await deleteEntryAction(e.id);
                    handleEntryDeleted(e.id);
                  }}
                />
              ))}
            </Grid>
            {!isSearching && <div ref={sentinelRef} />}
          </>
        )}

        {(loading || searchLoading) && (
          <div className="flex justify-center pt-6">
            <p className="text-sm text-(--grey-400)">Loading…</p>
          </div>
        )}
      </div>

      <FloatingCTA
        icon={<PlusSquareIcon size={22} />}
        onClick={() => {
          setEditingEntry(undefined);
          setModalOpen(true);
        }}
      />

      <EntryFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleEntrySuccess}
        {...(editingEntry !== undefined && { entry: editingEntry })}
      />
    </>
  );
}

"use client";

import { deleteEntryAction, fetchEntriesAction, searchEntriesAction } from "@/lib/actions";
import type { FilterParams, SortOption } from "@/lib/queries";
import type { EntryCursor } from "@/lib/queries";
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

/** Whether an entry would appear under the currently active filters. */
function matchesFilters(e: CardEntry, f: FilterParams): boolean {
  if (f.categories.length > 0 && !f.categories.includes(e.category)) return false;
  if (f.rating !== null && e.rating !== f.rating) return false;
  if (f.calendarScope) {
    const { year, month, day } = f.calendarScope;
    const [y, m, d] = e.date.split("-").map(Number);
    if (y !== year) return false;
    if (month !== undefined && m !== month) return false;
    if (day !== undefined && d !== day) return false;
  }
  return true;
}

/** Mirrors the ordering used by getEntries in queries.ts. Returns <0 if a sorts before b. */
function compareEntries(a: CardEntry, b: CardEntry, sort: SortOption): number {
  switch (sort) {
    case "date-asc":
      return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    case "title-asc":
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    case "category":
      return (
        a.category.localeCompare(b.category) ||
        -a.date.localeCompare(b.date) ||
        a.id.localeCompare(b.id)
      );
    case "rating-desc": {
      if (a.rating !== b.rating) {
        if (a.rating === null) return 1; // nulls last
        if (b.rating === null) return -1;
        return b.rating - a.rating; // highest first
      }
      return -a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    }
    default: // date-desc
      return -a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  }
}

export function EntriesGrid({ initialEntries, initialNextCursor, filters }: Props) {
  // ── Infinite-scroll state ─────────────────────────────────────────────────
  const [entries, setEntries] = useState<CardEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<EntryCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardEntry[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchIdRef = useRef(0);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CardEntry | undefined>(undefined);

  const isSearching = query.trim().length > 0;

  // ── Mutation handlers ─────────────────────────────────────────────────────
  function handleEntrySuccess(entry: CardEntry, isEdit: boolean) {
    if (isEdit) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
      setSearchResults((prev) => prev?.map((e) => (e.id === entry.id ? entry : e)) || null);
      return;
    }

    // New entry: only surface it if it belongs under the active filters, and
    // insert it at the position dictated by the active sort — not blindly on top.
    if (!matchesFilters(entry, filters)) return;
    setEntries((prev) => {
      const idx = prev.findIndex((e) => compareEntries(entry, e, filters.sort) < 0);
      if (idx === -1) {
        // Sorts after every loaded entry: if more pages remain it belongs to an
        // unloaded page, so let pagination surface it rather than mis-placing it.
        return nextCursor ? prev : [...prev, entry];
      }
      return [...prev.slice(0, idx), entry, ...prev.slice(idx)];
    });
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
              setEntries((prev) => {
                const seen = new Set(prev.map((e) => e.id));
                return [...prev, ...newEntries.filter((e) => !seen.has(e.id))];
              });
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

  // ── Search handlers ───────────────────────────────────────────────────────
  // Fires on every keystroke so we can flip into "searching" mode immediately —
  // this closes the debounce gap that let "No results" flash before loading.
  function handleImmediateSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      searchIdRef.current++;
      setSearchResults(null);
      setSearchLoading(false);
    } else {
      setSearchLoading(true);
    }
  }

  async function handleDebouncedSearch(value: string) {
    if (!value.trim()) {
      searchIdRef.current++;
      setQuery("");
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    const id = ++searchIdRef.current;
    setSearchLoading(true);
    try {
      const results = await searchEntriesAction(value, filters);
      if (id === searchIdRef.current) setSearchResults(results);
    } finally {
      if (id === searchIdRef.current) setSearchLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const displayEntries = isSearching ? (searchResults ?? []) : entries;
  const isEmpty = displayEntries.length === 0;
  // A brand-new search with no results yet: show "Searching…" rather than
  // letting an empty list read as "No results found."
  const showSearching = isSearching && searchLoading && searchResults === null;

  return (
    <>
      <div>
        <FilterBar
          filters={filters}
          onSearch={handleDebouncedSearch}
          onSearchImmediate={handleImmediateSearch}
        />

        {showSearching ? (
          <div className="flex justify-center pt-16">
            <p className="text-sm text-(--grey-400)">Searching…</p>
          </div>
        ) : isEmpty ? (
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

        {(loading || (isSearching && searchLoading && searchResults !== null)) && (
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

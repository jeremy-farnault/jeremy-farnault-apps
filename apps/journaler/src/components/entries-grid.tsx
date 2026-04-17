"use client";

import { fetchEntriesAction, searchEntriesAction } from "@/lib/actions";
import type { EntryCursor, FilterParams } from "@/lib/queries";
import { FloatingCTA, Grid, SearchInput } from "@jf/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { EntryCard, type CardEntry } from "./entry-card";

type Props = {
  initialEntries: CardEntry[];
  initialNextCursor: EntryCursor | null;
  filters: FilterParams;
};

function toCardEntry(e: {
  id: string;
  title: string;
  category: CardEntry["category"];
  date: string;
  comment: string | null;
  rating: number | null;
}): CardEntry {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    date: e.date,
    comment: e.comment,
    rating: e.rating,
    imageUrl: null,
  };
}

export function EntriesGrid({ initialEntries, initialNextCursor, filters }: Props) {
  // ── Infinite-scroll state ─────────────────────────────────────────────────
  const [entries, setEntries] = useState<CardEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<EntryCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<CardEntry[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const isSearching = searchResults !== null;

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
              setEntries((prev) => [...prev, ...newEntries.map(toCardEntry)]);
              setNextCursor(newCursor);
            })
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" },
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
      setSearchResults(results.map(toCardEntry));
    } finally {
      setSearchLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const displayEntries = isSearching ? searchResults! : entries;
  const isEmpty = displayEntries.length === 0;

  return (
    <>
      <div className="pb-24">
        <div className="mb-6 max-w-[300px]">
          <SearchInput placeholder="Search entries…" onDebouncedChange={handleDebouncedSearch} />
        </div>

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
                  onEdit={(e) => console.log("edit", e.id)}
                  onDelete={(e) => console.log("delete", e.id)}
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
        label="Log entry"
        icon={<PlusIcon size={20} />}
        onClick={() => console.log("open modal")}
      />
    </>
  );
}

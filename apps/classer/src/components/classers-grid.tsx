"use client";

import {
  archiveClasserAction,
  deleteClasserAction,
  fetchClassersAction,
  searchClassersAction,
} from "@/lib/actions";
import type { ClasserResult } from "@/lib/actions";
import type { ClasserCursor } from "@/lib/queries";
import { FloatingCTA, Grid, SearchInput } from "@jf/ui";
import { RankingIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { ClasserCardData } from "./classer-card";
import { ClasserCard } from "./classer-card";
import { ClasserFormModal } from "./classer-form-modal";

type Props = {
  initialClassers: ClasserCardData[];
  initialNextCursor: ClasserCursor | null;
};

export function ClassersGrid({ initialClassers, initialNextCursor }: Props) {
  // ── Infinite-scroll state ─────────────────────────────────────────────────
  const [classers, setClassers] = useState<ClasserCardData[]>(initialClassers);
  const [nextCursor, setNextCursor] = useState<ClasserCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<ClasserCardData[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClasser, setEditingClasser] = useState<ClasserCardData | undefined>(undefined);

  const isSearching = searchResults !== null;

  // ── Mutation handlers ─────────────────────────────────────────────────────
  function handleClasserSuccess(result: ClasserResult, isEdit: boolean) {
    if (isEdit) {
      const updated: ClasserCardData = {
        ...result,
        itemCount: classers.find((c) => c.id === result.id)?.itemCount ?? 0,
      };
      setClassers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSearchResults((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
    } else {
      const created: ClasserCardData = { ...result, itemCount: 0 };
      setClassers((prev) => [created, ...prev]);
    }
  }

  function handleClasserArchived(id: string) {
    setClassers((prev) => prev.filter((c) => c.id !== id));
    setSearchResults((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  function handleClasserDeleted(id: string) {
    setClassers((prev) => prev.filter((c) => c.id !== id));
    setSearchResults((prev) => prev?.filter((c) => c.id !== id) ?? null);
  }

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || loading || isSearching) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setLoading(true);
          fetchClassersAction(nextCursor)
            .then(({ classers: newClassers, nextCursor: newCursor }) => {
              setClassers((prev) => [...prev, ...newClassers]);
              setNextCursor(newCursor);
            })
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loading, isSearching]);

  // ── Search handler ────────────────────────────────────────────────────────
  async function handleDebouncedSearch(query: string) {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchClassersAction(query);
      setSearchResults(results);
    } finally {
      setSearchLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const displayClassers = searchResults ?? classers;
  const isEmpty = displayClassers.length === 0;

  return (
    <>
      <div>
        <div className="mb-6">
          <SearchInput onDebouncedChange={handleDebouncedSearch} placeholder="Search classers…" />
        </div>

        {isEmpty && !searchLoading ? (
          <div className="flex justify-center pt-16">
            <p>{isSearching ? "No results found." : "Nothing here yet."}</p>
          </div>
        ) : (
          <>
            <Grid>
              {displayClassers.map((classer) => (
                <ClasserCard
                  key={classer.id}
                  classer={classer}
                  onEdit={() => {
                    setEditingClasser(classer);
                    setModalOpen(true);
                  }}
                  onArchive={async () => {
                    await archiveClasserAction(classer.id);
                    handleClasserArchived(classer.id);
                  }}
                  onDelete={async () => {
                    await deleteClasserAction(classer.id);
                    handleClasserDeleted(classer.id);
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
        icon={<RankingIcon size={22} />}
        onClick={() => {
          setEditingClasser(undefined);
          setModalOpen(true);
        }}
      />

      <ClasserFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(result, isEdit) => {
          handleClasserSuccess(result, isEdit);
          setModalOpen(false);
        }}
        classer={editingClasser}
      />
    </>
  );
}

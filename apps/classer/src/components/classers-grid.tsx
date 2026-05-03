"use client";

import { archiveClasserAction, fetchClassersAction, searchClassersAction } from "@/lib/actions";
import type { ClasserResult } from "@/lib/actions";
import type { ClasserCursor } from "@/lib/queries";
import { FloatingCTA, Grid, SearchInput, Select, SelectItem } from "@jf/ui";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Breadcrumb } from "./breadcrumb";
import type { ClasserCardData } from "./classer-card";
import { ClasserCard } from "./classer-card";
import { ClasserFormModal } from "./classer-form-modal";

export type SortOption = "modified-desc" | "name-asc" | "name-desc" | "count-asc" | "count-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "modified-desc", label: "Last modified" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "count-asc", label: "Items ↑" },
  { value: "count-desc", label: "Items ↓" },
];

function sortClassers(classers: ClasserCardData[], sort: SortOption): ClasserCardData[] {
  return [...classers].sort((a, b) => {
    switch (sort) {
      case "modified-desc":
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "count-asc":
        return a.itemCount - b.itemCount;
      case "count-desc":
        return b.itemCount - a.itemCount;
    }
  });
}

type Props = {
  initialClassers: ClasserCardData[];
  initialNextCursor: ClasserCursor | null;
  sort: SortOption;
};

export function ClassersGrid({ initialClassers, initialNextCursor, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        updatedAt: new Date(),
      };
      setClassers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSearchResults((prev) => prev?.map((c) => (c.id === updated.id ? updated : c)) ?? null);
    } else {
      const created: ClasserCardData = { ...result, itemCount: 0, updatedAt: new Date() };
      setClassers((prev) => [created, ...prev]);
    }
  }

  function handleClasserArchived(id: string) {
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

  // ── Sort handler ──────────────────────────────────────────────────────────
  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const sorted = sortClassers(searchResults ?? classers, sort);
  const isEmpty = sorted.length === 0;

  return (
    <>
      <div>
        <Breadcrumb crumbs={[]} />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <SearchInput
            onDebouncedChange={handleDebouncedSearch}
            placeholder="Search classers…"
            className="min-w-[250px] max-w-[300px]"
          />
          <Select value={sort} onValueChange={handleSortChange} className="w-[250px]">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        {isEmpty && !searchLoading ? (
          <div className="flex justify-center pt-16">
            <p>{isSearching ? "No results found." : "Nothing here yet."}</p>
          </div>
        ) : (
          <>
            <Grid>
              {sorted.map((classer) => (
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

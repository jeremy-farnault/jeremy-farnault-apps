"use client";

import { FeedFilterBar } from "@/components/feed-filters";
import { FeedItem } from "@/components/feed-item";
import { ItemFormModal } from "@/components/item-form-modal";
import { fetchFeedPageAction } from "@/lib/actions";
import type { FeedCursor, FeedFilters, FeedItem as FeedItemData, FeedTag } from "@/lib/queries";
import { FloatingCTA } from "@jf/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  handle: string;
  isOwner: boolean;
  initialItems: FeedItemData[];
  initialCursor: FeedCursor | null;
  availableTags: FeedTag[];
};

function formatDay(date: string): string {
  // The `date` column is a "YYYY-MM-DD" string; the Z guard avoids the day drifting in
  // negative-offset timezones.
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Group the concatenated item list by day, preserving newest-first order. */
function groupByDay(items: FeedItemData[]): { date: string; items: FeedItemData[] }[] {
  const groups = new Map<string, FeedItemData[]>();
  for (const item of items) {
    const existing = groups.get(item.date);
    if (existing) existing.push(item);
    else groups.set(item.date, [item]);
  }
  return [...groups.entries()].map(([date, groupItems]) => ({ date, items: groupItems }));
}

const NO_FILTERS: FeedFilters = { tags: [], from: null, to: null };

function isActive(f: FeedFilters): boolean {
  return f.tags.length > 0 || f.from !== null || f.to !== null;
}

export function PortfolioFeed({
  handle,
  isOwner,
  initialItems,
  initialCursor,
  availableTags,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<FeedItemData[]>(initialItems);
  const [cursor, setCursor] = useState<FeedCursor | null>(initialCursor);
  const [filters, setFilters] = useState<FeedFilters>(NO_FILTERS);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef(filters);

  // Load page 1 for the given filters, replacing the current list. No round-trip when
  // there are no active filters — the unfiltered page 1 is exactly `initialItems`.
  const loadFirst = useCallback(
    (f: FeedFilters) => {
      if (!isActive(f)) {
        setItems(initialItems);
        setCursor(initialCursor);
        return;
      }
      setLoading(true);
      fetchFeedPageAction(handle, null, f)
        .then(({ items: next, nextCursor }) => {
          setItems(next);
          setCursor(nextCursor);
        })
        .finally(() => setLoading(false));
    },
    [handle, initialItems, initialCursor]
  );

  function applyFilters(next: FeedFilters) {
    filtersRef.current = next;
    setFilters(next);
    loadFirst(next);
  }

  // Re-seed after a mutation (router.refresh); respect any active filters.
  useEffect(() => {
    loadFirst(filtersRef.current);
  }, [loadFirst]);

  const loadMore = useCallback(() => {
    if (!cursor || loading) return;
    setLoading(true);
    fetchFeedPageAction(handle, cursor, filtersRef.current)
      .then(({ items: next, nextCursor }) => {
        setItems((prev) => [...prev, ...next]);
        setCursor(nextCursor);
      })
      .finally(() => setLoading(false));
  }, [cursor, loading, handle]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !cursor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    router.refresh();
  }

  const filtering = isActive(filters);
  const groups = groupByDay(items);

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
        <FeedFilterBar tags={availableTags} value={filters} onChange={applyFilters} />

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-base font-medium text-(--grey-900)">
              {filtering
                ? "No posts match your filters."
                : isOwner
                  ? "You haven't shared anything yet."
                  : "Nothing shared yet."}
            </p>
            {!filtering && isOwner && (
              <p className="max-w-sm text-sm text-(--grey-600)">
                Create your first post to start your portfolio.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.date} className="flex flex-col gap-4">
                <time className="text-xs font-medium uppercase tracking-wide text-(--grey-500)">
                  {formatDay(group.date)}
                </time>
                <div className="flex flex-col gap-8">
                  {group.items.map((item) => (
                    <FeedItem
                      key={item.id}
                      item={item}
                      {...(isOwner ? { onEdit: () => openEdit(item.id) } : {})}
                    />
                  ))}
                </div>
              </section>
            ))}
            {cursor && <div ref={sentinelRef} className="h-px w-full" />}
          </div>
        )}
      </main>

      {isOwner && (
        <>
          <FloatingCTA icon={<PlusIcon size={22} weight="bold" />} onClick={openCreate} />
          <ItemFormModal
            isOpen={modalOpen}
            itemId={editingId}
            onClose={() => setModalOpen(false)}
            onSaved={handleSaved}
          />
        </>
      )}
    </>
  );
}

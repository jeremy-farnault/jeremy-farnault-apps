"use client";

import { fetchEntriesAction } from "@/lib/actions";
import type { EntryCursor } from "@/lib/queries";
import { FloatingCTA, Grid } from "@jf/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { EntryCard, type CardEntry } from "./entry-card";

type Props = {
  initialEntries: CardEntry[];
  initialNextCursor: EntryCursor | null;
};

export function EntriesGrid({ initialEntries, initialNextCursor }: Props) {
  const [entries, setEntries] = useState<CardEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<EntryCursor | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoading(true);
          fetchEntriesAction(nextCursor)
            .then(({ entries: newEntries, nextCursor: newCursor }) => {
              setEntries((prev) => [
                ...prev,
                ...newEntries.map((e) => ({
                  id: e.id,
                  title: e.title,
                  category: e.category,
                  date: e.date,
                  comment: e.comment,
                  rating: e.rating,
                  imageUrl: null,
                })),
              ]);
              setNextCursor(newCursor);
            })
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextCursor, loading]);

  return (
    <>
      <div className="pb-24">
        {entries.length === 0 ? (
          <div className="flex justify-center pt-16">
            <p>Nothing here yet.</p>
          </div>
        ) : (
          <>
            <Grid>
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={(e) => console.log("edit", e.id)}
                  onDelete={(e) => console.log("delete", e.id)}
                />
              ))}
            </Grid>
            <div ref={sentinelRef} />
          </>
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

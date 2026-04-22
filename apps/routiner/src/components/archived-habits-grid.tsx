"use client";

import { deleteHabitAction, unarchiveHabitAction } from "@/lib/actions";
import type { Habit, HabitLog, SortOption } from "@/lib/queries";
import { ActionModal, Grid } from "@jf/ui";
import { ArchiveIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArchivedHabitCard } from "./archived-habit-card";
import { ArchivedHabitsFilterBar } from "./archived-habits-filter-bar";
import { Breadcrumb } from "./breadcrumb";

type Props = {
  habits: Habit[];
  logs: HabitLog[];
  sort: SortOption;
};

export function ArchivedHabitsGrid({ habits: initialHabits, logs, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localHabits, setLocalHabits] = useState<Habit[]>(initialHabits);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const logsMap = useMemo(() => {
    const map = new Map<string, HabitLog[]>();
    for (const log of logs) {
      const existing = map.get(log.habitId) ?? [];
      existing.push(log);
      map.set(log.habitId, existing);
    }
    return map;
  }, [logs]);

  const displayedHabits = useMemo(
    () => localHabits.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [localHabits, searchQuery]
  );

  function removeHabit(id: string) {
    setLocalHabits((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleUnarchive(id: string) {
    removeHabit(id);
    await unarchiveHabitAction(id);
  }

  function handleDeleteRequest(id: string) {
    setDeleteTargetId(id);
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    const id = deleteTargetId;
    removeHabit(id);
    try {
      await deleteHabitAction(id);
    } finally {
      setDeleteTargetId(null);
      setIsDeleting(false);
    }
  }

  function handleSortChange(value: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full px-4 pt-6 pb-24">
      <Breadcrumb crumbs={[{ label: "Archived" }]} />
      <ArchivedHabitsFilterBar
        sort={sort}
        onSearch={setSearchQuery}
        onSortChange={handleSortChange}
      />

      {displayedHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-(--grey-500)">
          <ArchiveIcon size={40} weight="thin" />
          <p className="text-sm">
            {searchQuery ? "No archived habits match your search." : "No archived habits."}
          </p>
        </div>
      ) : (
        <Grid className="sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
          {displayedHabits.map((habit) => (
            <ArchivedHabitCard
              key={habit.id}
              habit={habit}
              logs={logsMap.get(habit.id) ?? []}
              onUnarchive={handleUnarchive}
              onDelete={handleDeleteRequest}
            />
          ))}
        </Grid>
      )}

      <ActionModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        size="small"
        title="Delete habit?"
        paragraph="This will permanently delete the habit and all its logs."
        primaryButton={{ label: "Delete", loading: isDeleting, onClick: handleDeleteConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeleteTargetId(null) }}
      />
    </div>
  );
}

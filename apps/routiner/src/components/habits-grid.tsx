"use client";

import { archiveHabitAction, deleteHabitAction, searchHabitsAction } from "@/lib/actions";
import { type Habit, type HabitLog, type SortOption } from "@/lib/queries";
import { FloatingCTA, Grid } from "@jf/ui";
import { ClipboardIcon, PlusIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HabitCard } from "./habit-card";
import { HabitFormModal } from "./habit-form-modal";
import { HabitsFilterBar } from "./habits-filter-bar";
import { LogHabitModal } from "./log-habit-modal";

type Props = {
  habits: Habit[];
  logs: HabitLog[];
  sort: SortOption;
};

export function HabitsGrid({ habits: initialHabits, logs, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localHabits, setLocalHabits] = useState<Habit[]>(initialHabits);
  const [searchResults, setSearchResults] = useState<Habit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>(undefined);

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<{ habit: Habit; date: string; existingLog?: HabitLog } | null>(null);

  const logsMap = useMemo(() => {
    const map = new Map<string, HabitLog[]>();
    for (const log of logs) {
      const existing = map.get(log.habitId) ?? [];
      existing.push(log);
      map.set(log.habitId, existing);
    }
    return map;
  }, [logs]);

  function removeHabit(id: string) {
    setLocalHabits((prev) => prev.filter((h) => h.id !== id));
    setSearchResults((prev) => prev?.filter((h) => h.id !== id) ?? null);
  }

  async function handleArchive(id: string) {
    removeHabit(id);
    await archiveHabitAction(id);
  }

  async function handleDelete(id: string) {
    removeHabit(id);
    await deleteHabitAction(id);
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    const results = await searchHabitsAction(query);
    setSearchResults(results);
  }

  function handleSortChange(value: SortOption) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const displayedHabits = searchResults ?? localHabits;

  return (
    <div className="w-full px-4 pt-6 pb-24">
      <HabitsFilterBar sort={sort} onSearch={handleSearch} onSortChange={handleSortChange} />

      {displayedHabits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-(--grey-500)">
          <ClipboardIcon size={40} weight="thin" />
          <p className="text-sm">
            {isSearching ? "No habits match your search." : "No habits yet. Create your first one!"}
          </p>
        </div>
      ) : (
        <Grid className="sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2">
          {displayedHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              logs={logsMap.get(habit.id) ?? []}
              onLog={(date, existingLog) => { setLogTarget({ habit, date, ...(existingLog !== undefined ? { existingLog } : {}) }); setLogModalOpen(true); }}
              onEdit={() => { setEditingHabit(habit); setModalOpen(true); }}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </Grid>
      )}

      <FloatingCTA icon={<PlusIcon size={22} />} label="New habit" onClick={() => { setEditingHabit(undefined); setModalOpen(true); }} />

      <HabitFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        {...(editingHabit !== undefined ? { habit: editingHabit } : {})}
      />

      {logTarget && (
        <LogHabitModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          habit={logTarget.habit}
          targetDate={logTarget.date}
          {...(logTarget.existingLog !== undefined ? { existingLog: logTarget.existingLog } : {})}
        />
      )}
    </div>
  );
}

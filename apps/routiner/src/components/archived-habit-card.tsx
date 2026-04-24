"use client";

import { HabitHeatmap } from "@/components/habit-heatmap";
import type { Habit, HabitLog } from "@/lib/queries";
import { Tooltip } from "@jf/ui";
import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";

type Props = {
  habit: Habit;
  logs: HabitLog[];
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ArchivedHabitCard({ habit, logs, onUnarchive, onDelete }: Props) {
  const heatmapLogs = logs.map((l) => ({ date: l.date, value: l.value }));

  return (
    <div className="group flex flex-col gap-3 rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4">
      <HabitHeatmap
        logs={heatmapLogs}
        startDate={habit.startDate}
        type={habit.type}
        color={habit.color}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-(--grey-900) truncate">{habit.name}</span>

        <div className="flex items-center gap-0.5 shrink-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
          <Tooltip content="Unarchive">
            <button
              type="button"
              onClick={() => onUnarchive(habit.id)}
              aria-label="Unarchive habit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <ArrowCounterClockwiseIcon size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button
              type="button"
              onClick={() => onDelete(habit.id)}
              aria-label="Delete habit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <TrashIcon size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

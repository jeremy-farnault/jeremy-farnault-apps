"use client";

import { HabitHeatmap } from "@/components/habit-heatmap";
import type { Habit, HabitLog } from "@/lib/queries";
import { Tooltip } from "@jf/ui";
import { ArchiveIcon, CheckCircleIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";

type Props = {
  habit: Habit;
  logs: HabitLog[];
  onLog: (date: string, existingLog?: HabitLog) => void;
  onEdit: () => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function HabitCard({ habit, logs, onLog, onEdit, onArchive, onDelete }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find((l) => l.date === today);
  const hasLogToday = !!todayLog;

  const heatmapLogs = logs.map((l) => ({ date: l.date, value: l.value }));

  return (
    <div className="group flex flex-col gap-3 rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4">
      <HabitHeatmap
        logs={heatmapLogs}
        startDate={habit.startDate}
        type={habit.type}
        color={habit.color}
        onDayClick={(date) => {
          const existingLog = logs.find((l) => l.date === date);
          onLog(date, existingLog);
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/habit/${habit.id}`}
          className="text-base font-semibold text-(--grey-900) truncate hover:underline"
        >
          {habit.name}
        </Link>

        <div className="flex items-center gap-0.5 shrink-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
          <Tooltip content={hasLogToday ? "Edit today's log" : "Log today"}>
            <button
              type="button"
              onClick={() => onLog(today, todayLog)}
              aria-label={hasLogToday ? "Edit today's log" : "Log today"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <CheckCircleIcon size={18} weight={hasLogToday ? "fill" : "regular"} />
            </button>
          </Tooltip>
          <Tooltip content="Edit">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit habit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <PencilSimpleIcon size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Archive">
            <button
              type="button"
              onClick={() => onArchive(habit.id)}
              aria-label="Archive habit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <ArchiveIcon size={18} />
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

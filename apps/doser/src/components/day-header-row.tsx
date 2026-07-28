"use client";

import type { SymptomLogDetail } from "@/lib/queries";
import { cn } from "@jf/ui";

type Day = {
  date: string;
  dayOfMonth: number;
};

type Props = {
  days: Day[];
  today: string;
  symptomLogsByDate: Record<string, SymptomLogDetail>;
  onSelectDay: (date: string) => void;
};

export function DayHeaderRow({ days, today, symptomLogsByDate, onSelectDay }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      <h2 className="text-sm font-semibold text-(--grey-900)">Symptoms</h2>
      <div className="flex w-full flex-wrap gap-1.5">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDay(day.date)}
            aria-label={`Log symptoms for day ${day.dayOfMonth}`}
            className={cn(
              "relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium",
              "text-(--grey-500) hover:bg-(--surface-150)"
            )}
          >
            <span className={cn(day.date === today && "font-bold text-(--primary) underline")}>
              {day.dayOfMonth}
            </span>
            {day.date in symptomLogsByDate && (
              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-(--grey-900)" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

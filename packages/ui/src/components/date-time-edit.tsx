"use client";

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  useState,
} from "react";
import {
  type DayButtonProps,
  DayPicker,
  type MonthCaptionProps,
  useDayPicker,
} from "react-day-picker";
import type { DayPickerLocale } from "react-day-picker/locale";
import { cn } from "../lib/utils";
import { TimePickerPanel } from "./time-input";

interface DateTimeEditProps {
  initialValue: Date | null;
  onAccept: (date: Date | null) => void;
  onClose: () => void;
  disabled: boolean;
  locale?: Partial<DayPickerLocale>;
  accentColor?: string;
}

const YEAR_RANGE_BEFORE = 50;
const YEAR_RANGE_AFTER = 10;

function buildYearList(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear - YEAR_RANGE_BEFORE; y <= currentYear + YEAR_RANGE_AFTER; y++) {
    years.push(y);
  }
  return years;
}

// ------------------------------------------------------------------
// Calendar sub-components
// ------------------------------------------------------------------

interface CaptionProps extends MonthCaptionProps {
  onToggleYearView: () => void;
}

function Caption({ calendarMonth, onToggleYearView }: CaptionProps) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  const label = calendarMonth.date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full",
          "text-(--grey-700) hover:bg-(--surface-150) focus:outline-none",
          !previousMonth && "pointer-events-none opacity-30"
        )}
      >
        <CaretLeftIcon size={16} />
      </button>

      <button
        type="button"
        onClick={onToggleYearView}
        className="flex items-center gap-1 text-sm font-semibold text-(--grey-900) hover:opacity-70 focus:outline-none"
      >
        {label}
        <CaretDownIcon size={14} />
      </button>

      <button
        type="button"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full",
          "text-(--grey-700) hover:bg-(--surface-150) focus:outline-none",
          !nextMonth && "pointer-events-none opacity-30"
        )}
      >
        <CaretRightIcon size={16} />
      </button>
    </div>
  );
}

function DayButton({ day, modifiers, ...props }: DayButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full",
        "text-xs font-medium text-(--grey-700)",
        "hover:bg-(--surface-200) focus:outline-none",
        modifiers.selected && "bg-(--dt-accent) text-(--grey-900) hover:bg-(--dt-accent)",
        modifiers.today && !modifiers.selected && "bg-(--grey-300)",
        modifiers.outside && "opacity-40",
        modifiers.disabled && "pointer-events-none opacity-30"
      )}
    >
      {day.date.getDate()}
    </button>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export function DateTimeEdit({
  initialValue,
  onAccept,
  onClose,
  disabled,
  locale,
  accentColor = "var(--primary)",
}: DateTimeEditProps) {
  const now = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialValue ?? now);
  const [timeValue, setTimeValue] = useState<string>(
    `${String(initialValue?.getHours() ?? 0).padStart(2, "0")}:${String(initialValue?.getMinutes() ?? 0).padStart(2, "0")}`
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(initialValue ?? now);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const currentYear = calendarMonth.getFullYear();
  const yearList = buildYearList(currentYear);

  const handleSelectDate = (date: Date | undefined) => {
    if (date) setSelectedDate(date);
  };

  const handleSelectYear = (year: number) => {
    const next = new Date(calendarMonth);
    next.setFullYear(year);
    setCalendarMonth(next);
    setViewMode("month");
  };

  const handleConfirm = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const [h, m] = timeValue.split(":").map(Number);
    const chosenDate = new Date(selectedDate);
    chosenDate.setHours(h ?? 0, m ?? 0, 0, 0);
    onAccept(chosenDate);
    onClose();
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };

  return (
    <div style={{ "--dt-accent": accentColor } as CSSProperties}>
      <div className="relative flex flex-col">
        {/* Top section: calendar + time picker */}
        <div className="flex flex-row gap-6 border-b border-(--grey-200)">
          {/* Calendar */}
          <div className="flex-1 p-4 pl-6 pt-4">
            {viewMode === "year" ? (
              <div className="w-[284px]">
                {/* Year view header */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("month")}
                    className="flex items-center gap-1 text-sm font-semibold text-(--grey-900) hover:opacity-70 focus:outline-none"
                  >
                    {currentYear}
                    <CaretDownIcon size={14} className="rotate-180" />
                  </button>
                </div>
                {/* Year grid */}
                <div className="grid max-h-[192px] grid-cols-3 gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {yearList.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleSelectYear(year)}
                      style={year === currentYear ? { backgroundColor: "var(--dt-accent)" } : undefined}
                      className={cn(
                        "rounded-[10px] px-2 py-1.5 text-sm font-medium focus:outline-none",
                        year === currentYear
                          ? "text-(--grey-900)"
                          : "text-(--grey-600) hover:bg-(--surface-150)"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <DayPicker
                mode="single"
                selected={selectedDate}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                onSelect={handleSelectDate}
                locale={locale}
                classNames={{
                  root: "w-[284px]",
                  months: "w-full",
                  month: "w-full space-y-3",
                  month_caption: "w-full",
                  month_grid: "w-full border-collapse",
                  weekdays: "flex justify-center",
                  weekday: "w-9 py-1 text-center text-xs font-medium text-(--grey-500)",
                  week: "mt-1 flex justify-center",
                  day: "flex items-center justify-center",
                }}
                components={{
                  DayButton,
                  MonthCaption: (props) => (
                    <Caption
                      {...props}
                      onToggleYearView={() => setViewMode("year")}
                    />
                  ),
                }}
              />
            )}
          </div>

          {/* Time picker */}
          <div className="border-l border-(--grey-200)">
            <TimePickerPanel value={timeValue} onChange={setTimeValue} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-row justify-end gap-2 p-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--surface-100) text-(--grey-900) hover:bg-(--surface-150) focus:outline-none"
          >
            <XIcon size={20} />
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--surface-100) text-(--grey-900) hover:bg-(--surface-150) focus:outline-none disabled:bg-(--grey-200) disabled:cursor-not-allowed"
          >
            <CheckIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

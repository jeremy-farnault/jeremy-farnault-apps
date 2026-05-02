"use client";

import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { type CSSProperties, useState } from "react";
import {
  type DayButtonProps,
  DayPicker,
  type MonthCaptionProps,
  useDayPicker,
} from "react-day-picker";
import { cn } from "../lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  disablePast?: boolean;
  accentColor?: string;
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parts = value.split("-").map(Number);
  if (parts.length < 3) return undefined;
  return new Date(parts[0] as number, (parts[1] as number) - 1, parts[2] as number);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function CustomMonthCaption({ calendarMonth }: MonthCaptionProps) {
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
      <span className="text-sm font-semibold text-(--grey-900)">{label}</span>
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

function CustomDayButton({ day, modifiers, ...props }: DayButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full",
        "text-xs font-medium text-(--grey-700)",
        "hover:bg-(--surface-200) focus:outline-none",
        modifiers.selected && "bg-(--picker-accent) text-(--grey-900) hover:bg-(--picker-accent)",
        modifiers.today && !modifiers.selected && "bg-(--grey-300)",
        modifiers.outside && "opacity-40",
        modifiers.disabled && "pointer-events-none opacity-30"
      )}
    >
      {day.date.getDate()}
    </button>
  );
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select date",
  disablePast = false,
  accentColor = "var(--yellow-400)",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const formatted = selected ? formatDisplay(selected) : null;

  return (
    <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 w-[284px] items-center justify-between rounded-[10px]",
            "bg-(--surface-150) px-3 text-sm",
            "hover:bg-(--surface-200) focus:outline-none focus:ring-0",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            formatted ? "text-(--grey-900)" : "text-(--grey-500)"
          )}
        >
          <span>{formatted ?? placeholder}</span>
          <CalendarBlankIcon size={16} className="shrink-0 text-(--grey-700)" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)]",
            "rounded-[16px] bg-(--card) p-4",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <div style={{ "--picker-accent": accentColor } as CSSProperties}>
            <DayPicker
              mode="single"
              hideNavigation
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(toISODate(date));
                  setOpen(false);
                }
              }}
              disabled={disablePast ? { before: new Date() } : undefined}
              classNames={{
                root: "w-full",
                months: "w-full",
                month: "w-full space-y-3",
                month_caption: "w-full",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "w-9 py-1 text-center text-xs font-medium text-(--grey-500)",
                week: "mt-1 flex",
                day: "flex items-center justify-center",
              }}
              components={{
                DayButton: CustomDayButton,
                MonthCaption: CustomMonthCaption,
              }}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

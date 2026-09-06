"use client";

import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { type CSSProperties, useEffect, useState } from "react";
import {
  type DayButtonProps,
  DayPicker,
  type MonthCaptionProps,
  useDayPicker,
} from "react-day-picker";
import { getColorForeground } from "../lib/color-palette";
import { cn } from "../lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  disablePast?: boolean;
  minDate?: string;
  maxDate?: string;
  accentColor?: string;
  calendarAlign?: "start" | "end";
  className?: string;
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

function formatInput(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).padStart(4, "0");
  return `${d}/${m}/${y}`;
}

// Parse a typed date in DD/MM/YYYY (tolerating - or . separators).
function parseTypedDate(text: string): Date | undefined {
  const parts = text
    .trim()
    .split(/[/.\-\s]+/)
    .map(Number);
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts as [number, number, number];
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return undefined;
  if (y < 1000 || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, m - 1, d);
  // Reject overflow like 31/02 which JS would roll into March.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return undefined;
  }
  return date;
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
        modifiers.selected &&
          "bg-(--picker-accent) text-(--picker-accent-fg) hover:bg-(--picker-accent)",
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
  minDate,
  maxDate,
  accentColor = "var(--yellow-400)",
  calendarAlign = "start",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);

  // Local text for the typeable field, kept in sync with the external value.
  const [text, setText] = useState(selected ? formatInput(selected) : "");
  useEffect(() => {
    const d = parseDate(value);
    setText(d ? formatInput(d) : "");
  }, [value]);

  const min = minDate ? parseDate(minDate) : undefined;
  const max = maxDate ? parseDate(maxDate) : undefined;
  const disabledMatchers = [
    ...(disablePast ? [{ before: new Date() }] : []),
    ...(min ? [{ before: min }] : []),
    ...(max ? [{ after: max }] : []),
  ];

  function isWithinBounds(date: Date): boolean {
    if (min && date < min) return false;
    if (max && date > max) return false;
    if (disablePast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return false;
    }
    return true;
  }

  function commitText() {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (value) onChange("");
      setText("");
      return;
    }
    const parsed = parseTypedDate(trimmed);
    if (parsed && isWithinBounds(parsed)) {
      onChange(toISODate(parsed));
      setText(formatInput(parsed));
    } else {
      // Revert to the last valid value.
      setText(selected ? formatInput(selected) : "");
    }
  }

  return (
    <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex h-11 w-full items-center gap-1 rounded-[10px]",
          "bg-(--surface-150) pl-3 pr-1 text-sm",
          "focus-within:bg-(--surface-200)",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            } else if (e.key === "Escape") {
              setText(selected ? formatInput(selected) : "");
              e.currentTarget.blur();
            }
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none",
            "placeholder:text-(--grey-500)",
            text ? "text-(--grey-900)" : "text-(--grey-500)"
          )}
        />
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open calendar"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              "text-(--grey-700) hover:bg-(--surface-300) focus:outline-none",
              "disabled:pointer-events-none"
            )}
          >
            <CalendarBlankIcon size={16} />
          </button>
        </PopoverPrimitive.Trigger>
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={calendarAlign}
          sideOffset={6}
          className={cn(
            "relative z-[9100] w-[284px]",
            "rounded-[16px] bg-(--card) p-4",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <div
            style={
              {
                "--picker-accent": accentColor,
                "--picker-accent-fg": getColorForeground(accentColor),
              } as CSSProperties
            }
          >
            <DayPicker
              mode="single"
              hideNavigation
              showOutsideDays
              selected={selected}
              onSelect={(date) => {
                if (date) {
                  onChange(toISODate(date));
                  setText(formatInput(date));
                  setOpen(false);
                }
              }}
              disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
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

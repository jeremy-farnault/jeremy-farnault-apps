"use client";

import { ClockIcon } from "@phosphor-icons/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { getColorForeground } from "../lib/color-palette";
import { cn } from "../lib/utils";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
const ITEM_HEIGHT = 36;
const SPACER_HEIGHT = 159;

function parseTimeValue(value: string): { hour: number; minute: number } {
  const parts = value.split(":").map(Number);
  const h = parts[0] ?? Number.NaN;
  const m = parts[1] ?? Number.NaN;
  const hour = Number.isFinite(h) && h >= 0 && h <= 23 ? h : 0;
  const minute = Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0;
  return { hour, minute };
}

function toTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

interface TimeScrollPanelProps {
  hour: number;
  minute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  accentColor?: string;
}

function TimeScrollPanel({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  accentColor,
}: TimeScrollPanelProps) {
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hourScrollRef.current?.scrollTo({ top: hour * ITEM_HEIGHT, behavior: "smooth" });
  }, [hour]);

  useEffect(() => {
    minuteScrollRef.current?.scrollTo({ top: minute * ITEM_HEIGHT, behavior: "smooth" });
  }, [minute]);

  return (
    <div
      className="flex flex-row"
      style={
        accentColor
          ? ({
              "--dt-accent": accentColor,
              "--dt-accent-fg": getColorForeground(accentColor),
            } as CSSProperties)
          : undefined
      }
    >
      <div
        ref={hourScrollRef}
        className="relative flex w-11 flex-col p-1 [scrollbar-width:none] overflow-y-scroll max-h-[358px] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: SPACER_HEIGHT, flexShrink: 0 }} />
        {HOUR_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onHourChange(h)}
            style={h === hour ? { backgroundColor: "var(--dt-accent)" } : undefined}
            className={cn(
              "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 select-none focus:outline-none",
              h !== hour &&
                "hover:[background-color:color-mix(in_srgb,var(--dt-accent)_17%,transparent)]"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium",
                h === hour ? "text-(--dt-accent-fg)" : "text-(--grey-850)"
              )}
            >
              {h.toString().padStart(2, "0")}
            </span>
          </button>
        ))}
        <div style={{ height: SPACER_HEIGHT, flexShrink: 0 }} />
      </div>

      <div
        ref={minuteScrollRef}
        className="relative flex w-11 flex-col border-l border-(--grey-200) p-1 [scrollbar-width:none] overflow-y-scroll max-h-[358px] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ height: SPACER_HEIGHT, flexShrink: 0 }} />
        {MINUTE_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMinuteChange(m)}
            style={m === minute ? { backgroundColor: "var(--dt-accent)" } : undefined}
            className={cn(
              "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 select-none focus:outline-none",
              m !== minute &&
                "hover:[background-color:color-mix(in_srgb,var(--dt-accent)_17%,transparent)]"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium",
                m === minute ? "text-(--dt-accent-fg)" : "text-(--grey-850)"
              )}
            >
              {m.toString().padStart(2, "0")}
            </span>
          </button>
        ))}
        <div style={{ height: SPACER_HEIGHT, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export interface TimePickerPanelProps {
  value: string;
  onChange: (value: string) => void;
  accentColor?: string;
}

export function TimePickerPanel({ value, onChange, accentColor }: TimePickerPanelProps) {
  const { hour: parsedHour, minute: parsedMinute } = parseTimeValue(value);

  const [selectedHour, setSelectedHour] = useState(parsedHour);
  const [selectedMinute, setSelectedMinute] = useState(parsedMinute);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only re-syncs on external value change
  useEffect(() => {
    const { hour, minute } = parseTimeValue(value);
    if (hour !== selectedHour) setSelectedHour(hour);
    if (minute !== selectedMinute) setSelectedMinute(minute);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    onChange(toTimeString(hour, selectedMinute));
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    onChange(toTimeString(selectedHour, minute));
  };

  return (
    <TimeScrollPanel
      hour={selectedHour}
      minute={selectedMinute}
      onHourChange={handleHourChange}
      onMinuteChange={handleMinuteChange}
      {...(accentColor !== undefined && { accentColor })}
    />
  );
}

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  accentColor?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
}

export function TimeInput({
  value,
  onChange,
  accentColor = "var(--yellow-400)",
  placeholder = "Select time",
  disabled,
  align = "start",
}: TimeInputProps) {
  const [open, setOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount to initialize a missing value
  useEffect(() => {
    if (!value) {
      const now = new Date();
      onChange(toTimeString(now.getHours(), now.getMinutes()));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const initialHour = value ? parseTimeValue(value).hour : now.getHours();
  const initialMinute = value ? parseTimeValue(value).minute : now.getMinutes();

  const [selectedHour, setSelectedHour] = useState(initialHour);
  const [selectedMinute, setSelectedMinute] = useState(initialMinute);
  const [hourClicked, setHourClicked] = useState(false);
  const [minuteClicked, setMinuteClicked] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only re-syncs state when the popover opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      const { hour, minute } = value
        ? parseTimeValue(value)
        : { hour: now.getHours(), minute: now.getMinutes() };
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setHourClicked(false);
      setMinuteClicked(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    onChange(toTimeString(hour, selectedMinute));
    if (minuteClicked) {
      setOpen(false);
    } else {
      setHourClicked(true);
    }
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    onChange(toTimeString(selectedHour, minute));
    if (hourClicked) {
      setOpen(false);
    } else {
      setMinuteClicked(true);
    }
  };

  const formatted = value || null;

  return (
    <PopoverPrimitive.Root open={open && !disabled} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-[10px]",
            "bg-(--surface-150) px-3 text-sm",
            "hover:bg-(--surface-200) focus:outline-none focus:ring-0",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            formatted ? "text-(--grey-900)" : "text-(--grey-500)"
          )}
        >
          <span>{formatted ?? placeholder}</span>
          <ClockIcon size={16} className="shrink-0 text-(--grey-700)" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={6}
          className={cn(
            "z-50",
            "rounded-[16px] bg-(--card) p-4",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <TimeScrollPanel
            hour={selectedHour}
            minute={selectedMinute}
            onHourChange={handleHourChange}
            onMinuteChange={handleMinuteChange}
            {...(accentColor !== undefined && { accentColor })}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

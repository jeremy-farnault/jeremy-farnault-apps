"use client";

import { clearDayOverrideAction, setDayOverrideAction, setDoseTakenAction } from "@/lib/actions";
import type { Medicine, MedicineDayState } from "@/lib/queries";
import { cn } from "@jf/ui";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

type OverrideChoice = "on" | "off" | "auto";

type OverrideOptionProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

function OverrideOption({ label, selected, disabled, onSelect }: OverrideOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-[10px] px-3 py-2 text-left text-sm whitespace-nowrap",
        selected ? "bg-(--surface-150) font-medium text-(--grey-900)" : "text-(--grey-700)",
        "hover:bg-(--surface-150) disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      {label}
    </button>
  );
}

type PillProps = {
  day: MedicineDayState;
  color: string;
  isToday: boolean;
  isPending: boolean;
  isOverrideOpen: boolean;
  isApplyingOverride: boolean;
  onOverrideOpenChange: (open: boolean) => void;
  onTap: () => void;
  onLongPress: () => void;
  onSelectOverride: (choice: OverrideChoice) => void;
};

function Pill({
  day,
  color,
  isToday,
  isPending,
  isOverrideOpen,
  isApplyingOverride,
  onOverrideOpenChange,
  onTap,
  onLongPress,
  onSelectOverride,
}: PillProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (isPending) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_PX) {
      clearTimer();
      startRef.current = null;
    }
  }

  function handlePointerUp() {
    const wasTap = !longPressFiredRef.current && startRef.current !== null;
    clearTimer();
    startRef.current = null;
    if (wasTap) onTap();
  }

  function handlePointerCancel() {
    clearTimer();
    startRef.current = null;
  }

  const style: CSSProperties = day.isOn
    ? day.taken
      ? { backgroundColor: color, color: "white" }
      : { borderWidth: 2, borderStyle: "solid", borderColor: color, color: "var(--grey-900)" }
    : { backgroundColor: "var(--grey-200)", color: "var(--grey-500)" };

  return (
    <Popover.Root open={isOverrideOpen} onOpenChange={onOverrideOpenChange}>
      <Popover.Anchor asChild>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          onContextMenu={(e) => e.preventDefault()}
          aria-pressed={day.isOn ? day.taken : undefined}
          className={cn(
            "flex h-9 w-9 flex-shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-xs font-medium select-none",
            isPending && "opacity-60",
            isToday && "ring-2 ring-offset-2 ring-(--grey-900)"
          )}
          style={style}
        >
          {day.dayOfMonth}
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          className="z-50 flex flex-col gap-1 rounded-[14px] bg-(--card) p-2 shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none"
        >
          <OverrideOption
            label="On"
            selected={day.isOn}
            disabled={isApplyingOverride}
            onSelect={() => onSelectOverride("on")}
          />
          <OverrideOption
            label="Off"
            selected={!day.isOn}
            disabled={isApplyingOverride}
            onSelect={() => onSelectOverride("off")}
          />
          <OverrideOption
            label={`Auto (currently ${day.isOn ? "on" : "off"})`}
            selected={false}
            disabled={isApplyingOverride}
            onSelect={() => onSelectOverride("auto")}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type Props = {
  medicine: Medicine;
  days: MedicineDayState[];
  today: string;
  onEdit: () => void;
};

export function MedicineStrip({ medicine, days: initialDays, today, onEdit }: Props) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [openOverrideDate, setOpenOverrideDate] = useState<string | null>(null);
  const [isApplyingOverride, setIsApplyingOverride] = useState(false);

  useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

  function setDayTaken(date: string, taken: boolean) {
    setDays((prev) => prev.map((d) => (d.date === date ? { ...d, taken } : d)));
  }

  async function handleTap(day: MedicineDayState) {
    if (!day.isOn || pendingDates.has(day.date)) return;

    const previousTaken = day.taken;
    const nextTaken = !previousTaken;

    setDayTaken(day.date, nextTaken);
    setPendingDates((prev) => new Set(prev).add(day.date));

    try {
      await setDoseTakenAction({ medicineId: medicine.id, date: day.date, taken: nextTaken });
    } catch {
      setDayTaken(day.date, previousTaken);
      toast.error("Something went wrong");
    } finally {
      setPendingDates((prev) => {
        const next = new Set(prev);
        next.delete(day.date);
        return next;
      });
    }
  }

  async function handleSelectOverride(day: MedicineDayState, choice: OverrideChoice) {
    setIsApplyingOverride(true);
    try {
      if (choice === "auto") {
        await clearDayOverrideAction({ medicineId: medicine.id, date: day.date });
      } else {
        await setDayOverrideAction({
          medicineId: medicine.id,
          date: day.date,
          isOn: choice === "on",
        });
      }
      setOpenOverrideDate(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsApplyingOverride(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: medicine.color }}
          />
          <span className="text-sm font-medium text-(--grey-900)">{medicine.name}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${medicine.name}`}
          className="flex h-8 w-8 items-center justify-center text-(--grey-500) hover:text-(--grey-900)"
        >
          <PencilSimpleIcon size={16} />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((day) => (
          <Pill
            key={day.date}
            day={day}
            color={medicine.color}
            isToday={day.date === today}
            isPending={pendingDates.has(day.date)}
            isOverrideOpen={openOverrideDate === day.date}
            isApplyingOverride={isApplyingOverride}
            onOverrideOpenChange={(open) => setOpenOverrideDate(open ? day.date : null)}
            onTap={() => handleTap(day)}
            onLongPress={() => setOpenOverrideDate(day.date)}
            onSelectOverride={(choice) => handleSelectOverride(day, choice)}
          />
        ))}
      </div>
    </div>
  );
}

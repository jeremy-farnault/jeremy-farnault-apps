"use client";

/**
 * CalendarDrillDown — hierarchical year → month → day scope picker.
 * Self-contained (owns trigger + popover + Server Action calls).
 * Candidate for promotion to @jf/ui.
 */

import * as Popover from "@radix-ui/react-popover";
import { CalendarIcon, CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  getCalendarYearsAction,
  getCalendarMonthsAction,
  getCalendarDaysAction,
} from "@/lib/actions";
import { cn } from "@jf/ui";
import type { CalendarScope, FilterParams } from "@/lib/queries";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type YearRow  = { year: number; count: number };
type MonthRow = { month: number; count: number };
type DayRow   = { day: number; count: number };
type Level    = "years" | "months" | "days";

type Props = {
  scope: CalendarScope | null;
  onScopeChange: (scope: CalendarScope | null) => void;
  filters: Pick<FilterParams, "categories" | "rating">;
};

export function CalendarDrillDown({ scope, onScopeChange, filters }: Props) {
  const [open, setOpen]               = useState(false);
  const [level, setLevel]             = useState<Level>("years");
  const [years, setYears]             = useState<YearRow[]>([]);
  const [months, setMonths]           = useState<MonthRow[]>([]);
  const [days, setDays]               = useState<DayRow[]>([]);
  const [drilledYear, setDrilledYear] = useState<number | null>(null);
  const [drilledMonth, setDrilledMonth] = useState<number | null>(null);
  const [loading, setLoading]         = useState(false);

  // Track filters in a ref so the open-handler can read latest values.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Reset loaded data when composing filters change so counts stay accurate.
  useEffect(() => {
    setYears([]);
    setMonths([]);
    setDays([]);
    setLevel("years");
  }, [filters.categories, filters.rating]);

  async function loadYears() {
    setLoading(true);
    try {
      const rows = await getCalendarYearsAction(filtersRef.current);
      setYears(rows);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && years.length === 0) {
      await loadYears();
    }
    if (nextOpen) setLevel("years");
  }

  async function drillIntoYear(year: number) {
    setDrilledYear(year);
    setDrilledMonth(null);
    setLevel("months");
    setLoading(true);
    try {
      const rows = await getCalendarMonthsAction(year, filtersRef.current);
      setMonths(rows);
    } finally {
      setLoading(false);
    }
  }

  async function drillIntoMonth(month: number) {
    if (drilledYear === null) return;
    setDrilledMonth(month);
    setLevel("days");
    setLoading(true);
    try {
      const rows = await getCalendarDaysAction(drilledYear, month, filtersRef.current);
      setDays(rows);
    } finally {
      setLoading(false);
    }
  }

  function applyYear(year: number) {
    onScopeChange({ year });
    setOpen(false);
  }

  function applyMonth(month: number) {
    if (drilledYear === null) return;
    onScopeChange({ year: drilledYear, month });
    setOpen(false);
  }

  function applyDay(day: number) {
    if (drilledYear === null || drilledMonth === null) return;
    onScopeChange({ year: drilledYear, month: drilledMonth, day });
    setOpen(false);
  }

  function backToYears() {
    setLevel("years");
  }

  function backToMonths() {
    setLevel("months");
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function renderHeader() {
    if (level === "months" && drilledYear !== null) {
      return (
        <button
          type="button"
          onClick={backToYears}
          className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-(--grey-600)
                     hover:text-(--grey-900) transition-colors rounded-[14px]
                     hover:bg-(--surface-150)"
        >
          <CaretLeftIcon size={13} />
          {drilledYear}
        </button>
      );
    }
    if (level === "days" && drilledYear !== null && drilledMonth !== null) {
      return (
        <button
          type="button"
          onClick={backToMonths}
          className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-(--grey-600)
                     hover:text-(--grey-900) transition-colors rounded-[14px]
                     hover:bg-(--surface-150)"
        >
          <CaretLeftIcon size={13} />
          {MONTH_NAMES[drilledMonth - 1]} {drilledYear}
        </button>
      );
    }
    return null;
  }

  function renderRows() {
    if (loading) {
      return (
        <p className="px-3 py-4 text-sm text-(--grey-400) text-center">Loading…</p>
      );
    }

    if (level === "years") {
      if (years.length === 0) {
        return <p className="px-3 py-4 text-sm text-(--grey-400) text-center">No entries yet.</p>;
      }
      return years.map((row) => (
        <div key={row.year} className="flex items-center">
          <button
            type="button"
            onClick={() => applyYear(row.year)}
            className="flex-1 flex items-center justify-between px-3 py-2 text-sm rounded-l-[14px]
                       hover:bg-(--surface-150) transition-colors text-left"
          >
            <span className="font-medium">{row.year}</span>
            <span className="text-(--grey-400) text-xs">{row.count}</span>
          </button>
          <button
            type="button"
            onClick={() => drillIntoYear(row.year)}
            className="flex items-center justify-center w-8 h-9 rounded-r-[14px]
                       hover:bg-(--surface-150) transition-colors text-(--grey-400)
                       hover:text-(--grey-700)"
            aria-label={`Show months for ${row.year}`}
          >
            <CaretRightIcon size={13} />
          </button>
        </div>
      ));
    }

    if (level === "months") {
      return months.map((row) => (
        <div key={row.month} className="flex items-center">
          <button
            type="button"
            onClick={() => applyMonth(row.month)}
            className="flex-1 flex items-center justify-between px-3 py-2 text-sm rounded-l-[14px]
                       hover:bg-(--surface-150) transition-colors text-left"
          >
            <span>{MONTH_NAMES[row.month - 1]}</span>
            <span className="text-(--grey-400) text-xs">{row.count}</span>
          </button>
          <button
            type="button"
            onClick={() => drillIntoMonth(row.month)}
            className="flex items-center justify-center w-8 h-9 rounded-r-[14px]
                       hover:bg-(--surface-150) transition-colors text-(--grey-400)
                       hover:text-(--grey-700)"
            aria-label={`Show days for ${MONTH_NAMES[row.month - 1]}`}
          >
            <CaretRightIcon size={13} />
          </button>
        </div>
      ));
    }

    if (level === "days") {
      return days.map((row) => (
        <button
          key={row.day}
          type="button"
          onClick={() => applyDay(row.day)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm rounded-[14px]
                     hover:bg-(--surface-150) transition-colors text-left"
        >
          <span>{row.day}</span>
          <span className="text-(--grey-400) text-xs">{row.count}</span>
        </button>
      ));
    }

    return null;
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors",
            scope
              ? "bg-(--surface-200) text-(--teal-400)"
              : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)",
          )}
          aria-label="Filter by date"
        >
          <CalendarIcon size={18} weight={scope ? "fill" : "regular"} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-[220px] rounded-[22px] bg-(--card) p-2
                     shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]
                     animate-[overlay-in_0.3s_ease-in-out] outline-none"
        >
          {renderHeader()}
          <div className="flex flex-col">
            {renderRows()}
          </div>
          {scope && (
            <div className="mt-1 pt-1 border-t border-(--surface-150)">
              <button
                type="button"
                onClick={() => { onScopeChange(null); setOpen(false); }}
                className="flex items-center gap-1.5 w-full px-3 py-2 text-sm text-(--grey-500)
                           hover:text-(--grey-800) transition-colors rounded-[14px]
                           hover:bg-(--surface-150)"
              >
                <XIcon size={13} />
                Clear date filter
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

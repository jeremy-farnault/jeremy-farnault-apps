"use client";

import { Tooltip } from "@jf/ui";
import { useEffect, useRef, useState } from "react";

type HabitLog = { date: string; value: string };
type HabitType = "boolean" | "numeric" | "time";

interface HabitHeatmapProps {
  logs: HabitLog[];
  startDate: string;
  type: HabitType;
  color: string;
  onDayClick?: (date: string) => void;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shiftDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

// ISO Monday-first: 0=Mon … 6=Sun
function dayOfWeek(dateStr: string): number {
  return (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ─── Color utilities ──────────────────────────────────────────────────────────

function parseColorBase(colorVar: string): string {
  return colorVar.match(/--([a-z]+)-\d+/)?.[1] ?? "grey";
}

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

function getNumericStep(
  value: number,
  min: number,
  median: number,
  max: number,
): number {
  if (min === max) return 400;
  if (value === median) return 400;

  if (value < median) {
    if (median === min) return 400;
    const seg = (median - min) / 3;
    if (value < min + seg) return 100;
    if (value < min + 2 * seg) return 200;
    return 300;
  }

  if (median === max) return 400;
  const seg = (max - median) / 3;
  if (value < median + seg) return 500;
  if (value < median + 2 * seg) return 600;
  return 700;
}

// ─── Grid builder ─────────────────────────────────────────────────────────────

function buildWeekColumns(today: string): (string | null)[][] {
  const gridStart = shiftDays(today, -364);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(7).fill(null);

  for (let i = 0; i < 365; i++) {
    const date = shiftDays(gridStart, i);
    const dow = dayOfWeek(date);
    week[dow] = date;
    if (dow === 6) {
      weeks.push(week);
      week = new Array(7).fill(null);
    }
  }
  if (week.some((d) => d !== null)) weeks.push(week);

  return weeks;
}

// ─── Month labels ─────────────────────────────────────────────────────────────

function buildMonthLabels(weeks: (string | null)[][]): (string | null)[] {
  let lastMonth = -1;
  return weeks.map((week) => {
    const firstDate = week.find((d) => d !== null);
    if (!firstDate) return null;
    const month = new Date(`${firstDate}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return new Date(`${firstDate}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      });
    }
    return null;
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Row labels: show Mon / Wed / Fri, leave others empty (Monday-first grid)
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

// Height of the month label row in px: text-[9px] leading-none ≈ 9px + 4px gap below
const MONTH_ROW_OFFSET = 13;

// ─── Component ────────────────────────────────────────────────────────────────

export function HabitHeatmap({ logs, startDate, type, color, onDayClick }: HabitHeatmapProps) {
  const today = toDateStr(new Date());
  const colorBase = parseColorBase(color);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleWeekCount, setVisibleWeekCount] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setVisibleWeekCount(Math.floor((entry.contentRect.width + 3) / 15));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const logMap = new Map(logs.map((l) => [l.date, l.value]));

  // Pre-compute numeric scale
  let numericMin = 0;
  let numericMedian = 0;
  let numericMax = 0;

  if (type !== "boolean") {
    const values = logs
      .map((l) => parseFloat(l.value))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length > 0) {
      numericMin = values[0] ?? 0;
      numericMax = values[values.length - 1] ?? 0;
      numericMedian = computeMedian(values);
    }
  }

  function getSquareColor(date: string): string {
    const isBeforeStart = date < startDate;
    if (isBeforeStart) return "var(--grey-200)";

    const logValue = logMap.get(date);

    if (type === "boolean") {
      return logValue === "true" ? `var(--${colorBase}-400)` : "var(--grey-200)";
    }

    if (logValue === undefined) return "var(--grey-200)";
    const v = parseFloat(logValue);
    if (isNaN(v)) return "var(--grey-200)";
    const step = getNumericStep(v, numericMin, numericMedian, numericMax);
    return `var(--${colorBase}-${step})`;
  }

  function getTooltipContent(date: string): string {
    const label = formatTooltipDate(date);
    if (date < startDate) return `${label} · Not started`;
    const logValue = logMap.get(date);
    if (logValue === undefined) return `${label} · No log`;
    return `${label} · ${logValue}`;
  }

  const weeks = buildWeekColumns(today);
  const displayedWeeks = visibleWeekCount !== null ? weeks.slice(-visibleWeekCount) : weeks;
  const monthLabels = buildMonthLabels(displayedWeeks);

  return (
    <div className="flex items-start gap-2">
      {/* Static day-of-week labels — outside the scroll container */}
      <div
        className="flex flex-col shrink-0"
        style={{ gap: 3, paddingTop: MONTH_ROW_OFFSET }}
      >
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="h-3 flex items-center text-[9px] leading-none text-(--grey-400)"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-hidden flex-1 min-w-0" ref={containerRef}>
        <div className="flex flex-col gap-1">
          {/* Month labels row — absolutely positioned so text isn't clipped by flex cells */}
          <div
            className="relative h-[9px]"
            style={{ width: displayedWeeks.length * 15 - 3 }}
          >
            {monthLabels.map((label, col) =>
              label ? (
                <span
                  key={col}
                  className="absolute text-[9px] leading-none text-(--grey-400) whitespace-nowrap"
                  style={{ left: col * 15 }}
                >
                  {label}
                </span>
              ) : null,
            )}
          </div>

          {/* Squares grid */}
          <div className="flex gap-[3px]">
            {displayedWeeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-[3px]">
                {week.map((date, row) => {
                  if (date === null) return <div key={row} className="size-3" />;

                  const isBeforeStart = date < startDate;
                  const isFuture = date > today;
                  const squareColor = getSquareColor(date);
                  const isInteractive = !isBeforeStart && !isFuture && !!onDayClick;

                  return (
                    <Tooltip key={row} content={getTooltipContent(date)} side="top">
                      <button
                        type="button"
                        className="size-3 rounded-[2px] transition-opacity duration-150 hover:opacity-75"
                        style={{ backgroundColor: squareColor, cursor: isInteractive ? "pointer" : "default" }}
                        onClick={isInteractive ? () => onDayClick(date) : undefined}
                        aria-label={getTooltipContent(date)}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

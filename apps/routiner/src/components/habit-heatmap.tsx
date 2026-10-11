"use client";

import { Tooltip } from "@jf/ui";
import { type CSSProperties, useLayoutEffect, useRef } from "react";

/**
 * A day with nothing in it is drawn as an outline rather than a grey fill, so the grid
 * reads as slots waiting to be filled and the logged days carry all the colour weight.
 */
const EMPTY_SQUARE: CSSProperties = {
  backgroundColor: "transparent",
  border: "1px solid var(--border-strong)",
};

type HabitLog = { date: string; value: string };
type HabitType = "boolean" | "numeric" | "time";

interface HabitHeatmapProps {
  logs: HabitLog[];
  startDate: string;
  type: HabitType;
  color: string;
  onDayClick?: (date: string) => void;
  onMeasured?: () => void;
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

type ParsedColor = { hue: string; step: number };

// "var(--green-600)" → { hue: "green", step: 600 }. The step is the shade picked, so a dark
// variant has to keep it or it collapses into the light one.
function parseColor(colorVar: string): ParsedColor {
  const match = colorVar.match(/--([a-z]+)-(\d+)/);
  if (!match?.[1] || !match[2]) return { hue: "grey", step: 400 };
  return { hue: match[1], step: Number.parseInt(match[2], 10) };
}

// The numeric ramp runs 100–700 around a median of 400. Shift it so the median lands on the
// picked step, clamped so the whole ramp stays within the 100–900 token scale.
function rampOffset(pickedStep: number): number {
  return Math.min(Math.max(pickedStep - 400, 0), 200);
}

/**
 * The dark scales are split by use (DM-02), so stepping through 100–700 in dark mode jumps
 * between deep washes and light tints instead of rising. Dark mode instead fades the picked
 * colour into the page: one opacity per ramp step, faintest for the lowest values.
 */
const DARK_RAMP = [22, 34, 46, 58, 72, 86, 100];

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

// Parse a log value to a comparable number. Time logs ("HH:MM") become total
// minutes so the full time (not just the hour) drives the shade.
function parseLogValue(type: HabitType, value: string): number {
  if (type === "time") {
    const [h, m] = value.split(":");
    const hours = Number.parseInt(h ?? "", 10);
    const minutes = Number.parseInt(m ?? "", 10);
    if (Number.isNaN(hours)) return Number.NaN;
    return hours * 60 + (Number.isNaN(minutes) ? 0 : minutes);
  }
  return Number.parseFloat(value);
}

function getNumericStep(value: number, min: number, median: number, max: number): number {
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

export function HabitHeatmap({
  logs,
  startDate,
  type,
  color,
  onDayClick,
  onMeasured,
}: HabitHeatmapProps) {
  const today = toDateStr(new Date());
  const { hue, step: pickedStep } = parseColor(color);
  const containerRef = useRef<HTMLDivElement>(null);

  // Open scrolled to the right so today is in view; older weeks are a swipe away.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount; onMeasured is a one-shot callback
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    onMeasured?.();
  }, []);

  const logMap = new Map(logs.map((l) => [l.date, l.value]));

  // Pre-compute numeric scale
  let numericMin = 0;
  let numericMedian = 0;
  let numericMax = 0;

  if (type !== "boolean") {
    const values = logs
      .map((l) => parseLogValue(type, l.value))
      .filter((v) => !Number.isNaN(v))
      .sort((a, b) => a - b);

    if (values.length > 0) {
      numericMin = values[0] ?? 0;
      numericMax = values[values.length - 1] ?? 0;
      numericMedian = computeMedian(values);
    }
  }

  function getSquareStyle(date: string): CSSProperties {
    const isBeforeStart = date < startDate;
    if (isBeforeStart) return EMPTY_SQUARE;

    const logValue = logMap.get(date);

    if (type === "boolean") {
      return logValue === "true"
        ? { backgroundColor: `var(--${hue}-${pickedStep})` }
        : EMPTY_SQUARE;
    }

    if (logValue === undefined) return EMPTY_SQUARE;
    const v = parseLogValue(type, logValue);
    if (Number.isNaN(v)) return EMPTY_SQUARE;
    const rawStep = getNumericStep(v, numericMin, numericMedian, numericMax);
    // No inline background: `.heat-cell` in globals.css picks the light or dark ramp.
    return {
      "--heat-light": `var(--${hue}-${rawStep + rampOffset(pickedStep)})`,
      "--heat-dark": `color-mix(in oklab, var(--${hue}-${pickedStep}) ${DARK_RAMP[rawStep / 100 - 1]}%, transparent)`,
    } as CSSProperties;
  }

  function getTooltipContent(date: string): string {
    const label = formatTooltipDate(date);
    if (date < startDate) return `${label} · Not started`;
    const logValue = logMap.get(date);
    if (logValue === undefined) return `${label} · No log`;
    return `${label} · ${logValue}`;
  }

  const weeks = buildWeekColumns(today);
  const monthLabels = buildMonthLabels(weeks);

  return (
    <div className="flex items-start gap-2">
      {/* Static day-of-week labels — outside the scroll container */}
      <div className="flex flex-col shrink-0" style={{ gap: 3, paddingTop: MONTH_ROW_OFFSET }}>
        {DAY_LABELS.map((label, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: DAY_LABELS is a fixed 7-item array; position is the identity
            key={i}
            className="h-3 flex items-center text-[9px] leading-none text-(--text-subtle)"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div
        className="flex-1 min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={containerRef}
      >
        <div className="flex w-max flex-col gap-1">
          {/* Month labels row — absolutely positioned so text isn't clipped by flex cells */}
          <div className="relative h-[9px]" style={{ width: weeks.length * 15 - 3 }}>
            {monthLabels.map((label, col) =>
              label ? (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a year-long grid can show the same month twice, so the column is the identity
                  key={col}
                  className="absolute text-[9px] leading-none text-(--text-subtle) whitespace-nowrap"
                  style={{ left: col * 15 }}
                >
                  {label}
                </span>
              ) : null
            )}
          </div>

          {/* Squares grid */}
          <div className="flex gap-[3px]">
            {weeks.map((week, col) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: week column position is the identity in the heatmap grid
              <div key={col} className="flex flex-col gap-[3px]">
                {week.map((date, row) => {
                  // biome-ignore lint/suspicious/noArrayIndexKey: row position is the identity; null cells have no date
                  if (date === null) return <div key={row} className="size-3" />;

                  const isBeforeStart = date < startDate;
                  const isFuture = date > today;
                  const squareStyle = getSquareStyle(date);
                  const isInteractive = !isBeforeStart && !isFuture && !!onDayClick;

                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: row position is the identity within the week column
                    <Tooltip key={row} content={getTooltipContent(date)} side="top">
                      <button
                        type="button"
                        className="heat-cell size-3 rounded-[2px] transition-opacity duration-150 hover:opacity-75"
                        style={{
                          ...squareStyle,
                          cursor: isInteractive ? "pointer" : "default",
                        }}
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

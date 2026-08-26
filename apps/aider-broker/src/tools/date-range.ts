import { normalizeToolArguments } from "./args";

// ─── Deterministic date resolution ──────────────────────────────────────────────
// Small local models are unreliable at computing ISO date bounds from phrases
// like "this month", so a tool's model only declares intent (a `period` preset,
// a `month`, or an explicit custom range) and the exact bounds are computed
// here. All arithmetic is in UTC for determinism, matching how the DB stores
// dates. Shared by every date-range tool (workouts, journaler, routiner…).

export const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const DATE_RANGE_PERIODS = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
] as const;
export type DateRangePeriod = (typeof DATE_RANGE_PERIODS)[number];

function isDateRangePeriod(value: unknown): value is DateRangePeriod {
  return typeof value === "string" && (DATE_RANGE_PERIODS as readonly string[]).includes(value);
}

export function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function endOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function mondayOfWeek(d: Date): Date {
  const start = startOfUTCDay(d);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7; // getUTCDay: 0=Sun..6=Sat
  return new Date(start.getTime() - daysSinceMonday * MS_PER_DAY);
}

function resolvePeriod(period: DateRangePeriod, now: Date): DateRange {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (period) {
    case "this_week":
      return { startDate: mondayOfWeek(now), endDate: now };
    case "last_week": {
      const thisMonday = mondayOfWeek(now);
      return {
        startDate: new Date(thisMonday.getTime() - 7 * MS_PER_DAY),
        endDate: new Date(thisMonday.getTime() - 1),
      };
    }
    case "this_month":
      return { startDate: new Date(Date.UTC(y, m, 1)), endDate: now };
    case "last_month":
      return {
        startDate: new Date(Date.UTC(y, m - 1, 1)),
        endDate: new Date(Date.UTC(y, m, 1) - 1),
      };
    case "this_year":
      return { startDate: new Date(Date.UTC(y, 0, 1)), endDate: now };
    case "last_year":
      return {
        startDate: new Date(Date.UTC(y - 1, 0, 1)),
        endDate: new Date(Date.UTC(y, 0, 1) - 1),
      };
  }
}

function resolveMonth(month: string): DateRange | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  const endDate = endOfUTCDay(new Date(Date.UTC(year, monthIndex + 1, 0)));
  return { startDate, endDate };
}

function clampRange(range: DateRange, now: Date): DateRange {
  let { startDate, endDate } = range;
  if (endDate.getTime() > now.getTime()) endDate = now;
  if (endDate.getTime() - startDate.getTime() > MAX_RANGE_DAYS * MS_PER_DAY) {
    startDate = new Date(endDate.getTime() - MAX_RANGE_DAYS * MS_PER_DAY);
  }
  return { startDate, endDate };
}

/**
 * Resolve a tool's requested range into concrete UTC bounds. Precedence: an
 * explicit start+end custom range, then a specific `month`, then a relative
 * `period` preset. Returns null when nothing valid was provided. Reads the
 * shared `period` / `month` / `start_date` / `end_date` argument shape.
 */
export function parseDateRangeArgs(raw: unknown, now: Date = new Date()): DateRange | null {
  const args = normalizeToolArguments(raw);
  const { start_date, end_date, month, period } = args;

  if (typeof start_date === "string" && typeof end_date === "string") {
    const a = new Date(start_date);
    const b = new Date(end_date);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    const [startDate, endDate] = a.getTime() <= b.getTime() ? [a, b] : [b, a];
    return clampRange({ startDate, endDate }, now);
  }

  if (typeof month === "string") {
    const resolved = resolveMonth(month);
    return resolved ? clampRange(resolved, now) : null;
  }

  if (isDateRangePeriod(period)) {
    return clampRange(resolvePeriod(period, now), now);
  }

  return null;
}

// The shared JSON-schema block for a tool's date-range parameters, so every
// date-range tool advertises identical `period`/`month`/`start_date`/`end_date`
// arguments to the model.
export const DATE_RANGE_PARAMETERS = {
  period: {
    type: "string",
    enum: [...DATE_RANGE_PERIODS],
    description:
      "A relative period, resolved against today's date. Use this for 'this week', 'last week', 'this month', 'last month', 'this year', 'last year'.",
  },
  month: {
    type: "string",
    description:
      "A specific calendar month as YYYY-MM (e.g. '2026-08' for August 2026). Use when the user names a month and year.",
  },
  start_date: {
    type: "string",
    description: "Custom range start, inclusive, ISO 8601 (YYYY-MM-DD). Requires end_date.",
  },
  end_date: {
    type: "string",
    description: "Custom range end, inclusive, ISO 8601 (YYYY-MM-DD). Requires start_date.",
  },
} as const;

/** Format a resolved range back to `YYYY-MM-DD` bounds for echoing to the model. */
export function rangeToIsoDates(range: DateRange): { start_date: string; end_date: string } {
  return {
    start_date: range.startDate.toISOString().slice(0, 10),
    end_date: range.endDate.toISOString().slice(0, 10),
  };
}

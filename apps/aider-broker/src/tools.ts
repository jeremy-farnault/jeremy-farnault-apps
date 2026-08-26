import type { ToolDefinition } from "./types";
import { getWorkoutsInRange } from "./workouts-query";

export const GET_WORKOUTS_TOOL_NAME = "get_workouts_in_range";

export const GET_WORKOUTS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_WORKOUTS_TOOL_NAME,
    description:
      "Get the count and list of the user's completed workout sessions over a time period. " +
      "Use this WHENEVER the user asks anything about their training or workouts — frequency, " +
      "history, or what they trained — over any period: a week, a month, a year, or specific dates. " +
      "Never answer such questions from memory; always call this tool. Prefer the `period` argument " +
      "for relative ranges like 'this week' or 'last month'. Use `month` (YYYY-MM) when the user names " +
      "a specific calendar month such as 'August 2026'. Only use `start_date`+`end_date` for an explicit " +
      "custom range the presets don't cover.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "this_year", "last_year"],
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
      },
      required: [],
    },
  },
};

export const AVAILABLE_TOOLS: ToolDefinition[] = [GET_WORKOUTS_TOOL];

const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeToolArguments(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ─── Deterministic date resolution ──────────────────────────────────────────────
// Small local models are unreliable at computing ISO date bounds from phrases
// like "this month", so the model only declares intent (a `period` preset, a
// `month`, or an explicit custom range) and the exact bounds are computed here.
// All arithmetic is in UTC for determinism, matching how the DB stores dates.

const WORKOUTS_PERIODS = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
] as const;
type WorkoutsPeriod = (typeof WORKOUTS_PERIODS)[number];

function isWorkoutsPeriod(value: unknown): value is WorkoutsPeriod {
  return typeof value === "string" && (WORKOUTS_PERIODS as readonly string[]).includes(value);
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function mondayOfWeek(d: Date): Date {
  const start = startOfUTCDay(d);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7; // getUTCDay: 0=Sun..6=Sat
  return new Date(start.getTime() - daysSinceMonday * MS_PER_DAY);
}

function resolvePeriod(period: WorkoutsPeriod, now: Date): DateRange {
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
 * Resolve the model's requested range into concrete UTC bounds. Precedence:
 * an explicit start+end custom range, then a specific `month`, then a relative
 * `period` preset. Returns null when nothing valid was provided.
 */
export function parseWorkoutsDateRangeArgs(raw: unknown, now: Date = new Date()): DateRange | null {
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

  if (isWorkoutsPeriod(period)) {
    return clampRange(resolvePeriod(period, now), now);
  }

  return null;
}

export async function executeGetWorkoutsInRange(userId: string, rawArgs: unknown): Promise<string> {
  const range = parseWorkoutsDateRangeArgs(rawArgs);
  if (!range) {
    return JSON.stringify({ error: "invalid_date_range" });
  }

  try {
    const sessions = await getWorkoutsInRange(userId, range.startDate, range.endDate);
    return JSON.stringify({
      // Echo the resolved range back so the model reports the dates it actually
      // queried rather than inventing them.
      range: {
        start_date: range.startDate.toISOString().slice(0, 10),
        end_date: range.endDate.toISOString().slice(0, 10),
      },
      count: sessions.length,
      sessions: sessions.map((s) => ({
        name: s.name,
        started_at: s.startedAt.toISOString(),
        finished_at: s.finishedAt.toISOString(),
      })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

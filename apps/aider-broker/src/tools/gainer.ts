import type { RegisteredTool, ToolDefinition } from "../types";
import { normalizeToolArguments } from "./args";
import {
  DATE_RANGE_PARAMETERS,
  type DateRange,
  endOfUTCDay,
  mondayOfWeek,
  parseDateRangeArgs,
  rangeToIsoDates,
  startOfUTCDay,
} from "./date-range";
import { getExercisesOnDay, getWorkoutsInRange } from "./gainer-query";

// ─── get_workouts_in_range ──────────────────────────────────────────────────────

export const GET_WORKOUTS_TOOL_NAME = "get_workouts_in_range";

export const GET_WORKOUTS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_WORKOUTS_TOOL_NAME,
    description:
      "Get the count and list of the user's completed workout sessions over a time PERIOD. " +
      "Use this when the user asks HOW MANY times or HOW OFTEN they trained, or for their training " +
      "frequency/history over a week, month, year, or date range. For the exercises done on ONE " +
      "specific day, use get_exercises_on_day instead. Never answer such questions from memory; " +
      "always call this tool. Prefer the `period` argument for relative ranges like 'this week' or " +
      "'last month'. Use `month` (YYYY-MM) when the user names a specific calendar month such as " +
      "'August 2026'. Only use `start_date`+`end_date` for an explicit custom range the presets " +
      "don't cover. Returns at most one year of sessions.",
    parameters: {
      type: "object",
      properties: { ...DATE_RANGE_PARAMETERS },
      required: [],
    },
  },
};

export async function executeGetWorkoutsInRange(userId: string, rawArgs: unknown): Promise<string> {
  const range = parseDateRangeArgs(rawArgs);
  if (!range) {
    return JSON.stringify({ error: "invalid_date_range" });
  }

  try {
    const sessions = await getWorkoutsInRange(userId, range.startDate, range.endDate);
    return JSON.stringify({
      // Echo the resolved range back so the model reports the dates it actually
      // queried rather than inventing them.
      range: rangeToIsoDates(range),
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

const GAINER_KEYWORDS = [
  "workout",
  "work out",
  "train",
  "training",
  "trained",
  "gym",
  "exercise",
  "exercises",
  "lift",
  "session",
];

export const gainerWorkoutsTool: RegisteredTool = {
  definition: GET_WORKOUTS_TOOL,
  execute: executeGetWorkoutsInRange,
  keywords: GAINER_KEYWORDS,
};

// ─── get_exercises_on_day ───────────────────────────────────────────────────────

export const GET_EXERCISES_TOOL_NAME = "get_exercises_on_day";

const RELATIVE_DAYS = [
  "today",
  "yesterday",
  "this_monday",
  "this_tuesday",
  "this_wednesday",
  "this_thursday",
  "this_friday",
  "this_saturday",
  "this_sunday",
  "last_monday",
  "last_tuesday",
  "last_wednesday",
  "last_thursday",
  "last_friday",
  "last_saturday",
  "last_sunday",
] as const;
type RelativeDay = (typeof RELATIVE_DAYS)[number];

export const GET_EXERCISES_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_EXERCISES_TOOL_NAME,
    description:
      "Get the specific exercises (movements) the user did on ONE given day, grouped by session, " +
      "with a set count each. Use this when the user asks WHICH exercises/movements they did on a " +
      "particular day such as 'last Tuesday', 'yesterday', or a specific date. For how MANY times " +
      "they trained over a period, use get_workouts_in_range instead. Never answer from memory; " +
      "always call this tool. Returns the exercises for a single day only.",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "An explicit day, ISO 8601 (YYYY-MM-DD). Use when the user gives a precise date.",
        },
        day: {
          type: "string",
          enum: [...RELATIVE_DAYS],
          description:
            "A relative day, resolved against today's date. Use for 'today', 'yesterday', or a named " +
            "weekday like 'last Tuesday' (last_tuesday) or 'this Friday' (this_friday).",
        },
      },
      required: [],
    },
  },
};

// Offset in days from the Monday of a week, keyed by weekday name.
const WEEKDAY_OFFSET: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function isRelativeDay(value: unknown): value is RelativeDay {
  return typeof value === "string" && (RELATIVE_DAYS as readonly string[]).includes(value);
}

function resolveRelativeDay(day: RelativeDay, now: Date): Date {
  if (day === "today") return startOfUTCDay(now);
  if (day === "yesterday") return new Date(startOfUTCDay(now).getTime() - 24 * 60 * 60 * 1000);

  const [which, weekday] = day.split("_");
  const monday = mondayOfWeek(now);
  const offset = WEEKDAY_OFFSET[weekday ?? ""] ?? 0;
  const base = new Date(monday.getTime() + offset * 24 * 60 * 60 * 1000);
  return which === "last" ? new Date(base.getTime() - 7 * 24 * 60 * 60 * 1000) : base;
}

/**
 * Resolve the model's requested single day into a UTC day window. Precedence:
 * an explicit ISO `date`, then a relative `day` preset. Returns null when
 * nothing valid was provided.
 */
export function parseExerciseDayArgs(raw: unknown, now: Date = new Date()): DateRange | null {
  const args = normalizeToolArguments(raw);
  const { date, day } = args;

  if (typeof date === "string") {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return null;
    return { startDate: startOfUTCDay(parsed), endDate: endOfUTCDay(parsed) };
  }

  if (isRelativeDay(day)) {
    const resolved = resolveRelativeDay(day, now);
    return { startDate: startOfUTCDay(resolved), endDate: endOfUTCDay(resolved) };
  }

  return null;
}

// Cap on exercises returned per session, so an unusually long session can't
// overflow the model context.
const MAX_EXERCISES_PER_SESSION = 50;

export async function executeGetExercisesOnDay(userId: string, rawArgs: unknown): Promise<string> {
  const window = parseExerciseDayArgs(rawArgs);
  if (!window) {
    return JSON.stringify({ error: "invalid_day" });
  }

  try {
    const sessions = await getExercisesOnDay(userId, window.startDate, window.endDate);
    return JSON.stringify({
      date: window.startDate.toISOString().slice(0, 10),
      sessions: sessions.map((session) => ({
        name: session.name,
        exercises: session.exercises.slice(0, MAX_EXERCISES_PER_SESSION).map((ex) => ({
          name: ex.name,
          type: ex.type,
          set_count: ex.setCount,
        })),
      })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

export const gainerExercisesTool: RegisteredTool = {
  definition: GET_EXERCISES_TOOL,
  execute: executeGetExercisesOnDay,
  keywords: GAINER_KEYWORDS,
};

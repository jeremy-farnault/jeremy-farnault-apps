import type { ToolDefinition } from "./types";
import { getWorkoutsInRange } from "./workouts-query";

export const GET_WORKOUTS_TOOL_NAME = "get_workouts_in_range";

export const GET_WORKOUTS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_WORKOUTS_TOOL_NAME,
    description:
      "Get the user's completed workout sessions whose start date falls within a date range. " +
      "Use this whenever the user asks about training frequency, history, or what they trained on specific dates.",
    parameters: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start of range, inclusive, ISO 8601 (YYYY-MM-DD).",
        },
        end_date: {
          type: "string",
          description: "End of range, inclusive, ISO 8601 (YYYY-MM-DD).",
        },
      },
      required: ["start_date", "end_date"],
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

export function parseWorkoutsDateRangeArgs(raw: unknown): DateRange | null {
  const args = normalizeToolArguments(raw);
  const { start_date, end_date } = args;
  if (typeof start_date !== "string" || typeof end_date !== "string") return null;

  const a = new Date(start_date);
  const b = new Date(end_date);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  let [startDate, endDate] = a.getTime() <= b.getTime() ? [a, b] : [b, a];

  const now = new Date();
  if (endDate.getTime() > now.getTime()) endDate = now;

  if (endDate.getTime() - startDate.getTime() > MAX_RANGE_DAYS * MS_PER_DAY) {
    startDate = new Date(endDate.getTime() - MAX_RANGE_DAYS * MS_PER_DAY);
  }

  return { startDate, endDate };
}

export async function executeGetWorkoutsInRange(userId: string, rawArgs: unknown): Promise<string> {
  const range = parseWorkoutsDateRangeArgs(rawArgs);
  if (!range) {
    return JSON.stringify({ error: "invalid_date_range" });
  }

  try {
    const sessions = await getWorkoutsInRange(userId, range.startDate, range.endDate);
    return JSON.stringify({
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

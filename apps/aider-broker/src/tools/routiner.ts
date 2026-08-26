import type { RegisteredTool, ToolDefinition } from "../types";
import { normalizeToolArguments } from "./args";
import { DATE_RANGE_PARAMETERS, parseDateRangeArgs, rangeToIsoDates } from "./date-range";
import { getHabitLogsInRange, listHabitNames } from "./routiner-query";

export const GET_HABIT_LOG_COUNT_TOOL_NAME = "get_habit_log_count";

// Max individual log rows echoed back; the `count` is the primary answer and is
// computed over the full set before this cap.
const MAX_LOGS = 100;

export const GET_HABIT_LOG_COUNT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_HABIT_LOG_COUNT_TOOL_NAME,
    description:
      "Get how many times the user logged/kept a specific habit or routine (the Routiner app) over a " +
      "time period. Use this when the user asks how many times or how consistently they did a named " +
      "habit, e.g. 'how many times did I log meditation this month'. Provide the habit name in " +
      "`habit`. For yes/no habits, only days marked done are counted. Prefer the `period` argument " +
      "for relative ranges; use `month` (YYYY-MM) for a named month, or `start_date`+`end_date` for a " +
      "custom range. Returns the count plus up to 100 logged days.",
    parameters: {
      type: "object",
      properties: {
        habit: {
          type: "string",
          description:
            "The habit/routine name in the user's words (e.g. 'meditation'). Matched loosely against the user's habit names.",
        },
        ...DATE_RANGE_PARAMETERS,
      },
      required: ["habit"],
    },
  },
};

export async function executeGetHabitLogCount(userId: string, rawArgs: unknown): Promise<string> {
  const habit = normalizeToolArguments(rawArgs).habit;
  if (typeof habit !== "string" || habit.trim().length === 0) {
    return JSON.stringify({ error: "invalid_arguments" });
  }

  const range = parseDateRangeArgs(rawArgs);
  if (!range) {
    return JSON.stringify({ error: "invalid_date_range" });
  }
  const { start_date, end_date } = rangeToIsoDates(range);

  try {
    const result = await getHabitLogsInRange(userId, habit.trim(), start_date, end_date);
    if (!result) {
      const available = await listHabitNames(userId);
      return JSON.stringify({ error: "no_matching_habit", available });
    }

    // A boolean habit stores "true"/"false" per day, so a "false" row is an
    // explicit not-done record and must not be counted. Numeric/time habits
    // have no done flag — a row is a recorded day, so count row existence.
    const count =
      result.type === "boolean"
        ? result.logs.filter((log) => log.value === "true").length
        : result.logs.length;

    return JSON.stringify({
      range: { start_date, end_date },
      habit: result.name,
      type: result.type,
      count,
      logs: result.logs.slice(0, MAX_LOGS).map((log) => ({ date: log.date, value: log.value })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

export const routinerLogCountTool: RegisteredTool = {
  definition: GET_HABIT_LOG_COUNT_TOOL,
  execute: executeGetHabitLogCount,
  keywords: ["habit", "habits", "routine", "routines", "streak", "consistent", "consistency"],
};

import type { RegisteredTool, ToolDefinition } from "../types";
import { normalizeToolArguments } from "./args";
import { DATE_RANGE_PARAMETERS, parseDateRangeArgs, rangeToIsoDates } from "./date-range";
import { type MediaCategory, getMediaInRange } from "./journaler-query";

export const GET_MEDIA_TOOL_NAME = "get_media_in_range";

// Mirrors the journaler_category DB enum; kept as a local tuple so this module
// doesn't import the DB package at runtime (the query layer owns DB access).
const MEDIA_CATEGORIES = ["Movie", "TV Show", "Book", "Game", "Manga"] as const;

// Max entries returned, so a long watch/read history can't overflow context.
const MAX_ENTRIES = 50;

export const GET_MEDIA_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_MEDIA_TOOL_NAME,
    description:
      "Get the movies, TV shows, books, games, or manga the user logged (the Journaler app) over a " +
      "time period, with each entry's title, category, and rating. Use this when the user asks what " +
      "they watched, read, or played in a period, e.g. 'which movies did I watch this month'. " +
      "Optionally filter with `category`. Prefer the `period` argument for relative ranges; use " +
      "`month` (YYYY-MM) for a named month, or `start_date`+`end_date` for a custom range. Returns at " +
      "most 50 entries.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [...MEDIA_CATEGORIES],
          description: "Optional media type to filter by. Omit to include all categories.",
        },
        ...DATE_RANGE_PARAMETERS,
      },
      required: [],
    },
  },
};

function parseCategory(raw: unknown): MediaCategory | undefined {
  return typeof raw === "string" && (MEDIA_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as MediaCategory)
    : undefined;
}

export async function executeGetMediaInRange(userId: string, rawArgs: unknown): Promise<string> {
  const range = parseDateRangeArgs(rawArgs);
  if (!range) {
    return JSON.stringify({ error: "invalid_date_range" });
  }
  const category = parseCategory(normalizeToolArguments(rawArgs).category);
  const { start_date, end_date } = rangeToIsoDates(range);

  try {
    const entries = await getMediaInRange(userId, start_date, end_date, MAX_ENTRIES, category);
    return JSON.stringify({
      range: { start_date, end_date },
      ...(category ? { category } : {}),
      count: entries.length,
      entries: entries.map((entry) => ({
        title: entry.title,
        category: entry.category,
        rating: entry.rating,
        date: entry.date,
      })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

export const journalerMediaTool: RegisteredTool = {
  definition: GET_MEDIA_TOOL,
  execute: executeGetMediaInRange,
  keywords: [
    "watch",
    "watched",
    "movie",
    "movies",
    "show",
    "shows",
    "book",
    "books",
    "read",
    "game",
    "games",
    "manga",
    "play",
    "played",
  ],
};

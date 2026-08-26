import type { RegisteredTool, ToolDefinition } from "../types";
import { normalizeToolArguments } from "./args";
import { getTopItemsInList, listClasserNames } from "./classer-query";

export const GET_TOP_ITEMS_TOOL_NAME = "get_top_items_in_list";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export const GET_TOP_ITEMS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_TOP_ITEMS_TOOL_NAME,
    description:
      "Get the user's top-ranked items from one of their personal ranked lists (the Classer app, " +
      "where the user keeps ordered rankings like 'Liquors', 'Movies', 'Restaurants'). Use this when " +
      "the user asks for their top/best/favourite N of something they rank, e.g. 'what are my top 3 " +
      "liquors'. Provide the list name in `list` and optionally how many in `limit`. Returns at most " +
      "20 items, ordered best-first.",
    parameters: {
      type: "object",
      properties: {
        list: {
          type: "string",
          description:
            "The name of the ranked list to read, in the user's words (e.g. 'liquors', 'movies'). Matched loosely against the user's list names.",
        },
        limit: {
          type: "number",
          description: "How many top items to return (default 5, maximum 20).",
        },
      },
      required: ["list"],
    },
  },
};

export interface TopItemsArgs {
  list: string;
  limit: number;
}

/**
 * Validate and normalize the tool arguments. Requires a non-empty `list`;
 * clamps `limit` into [1, MAX_LIMIT], defaulting when absent or unparseable.
 * Returns null when no usable list name was provided.
 */
export function parseTopItemsArgs(raw: unknown): TopItemsArgs | null {
  const args = normalizeToolArguments(raw);
  const { list, limit } = args;

  if (typeof list !== "string" || list.trim().length === 0) return null;

  const parsedLimit = Number(limit);
  const clamped =
    Number.isFinite(parsedLimit) && parsedLimit >= 1
      ? Math.min(Math.floor(parsedLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  return { list: list.trim(), limit: clamped };
}

export async function executeGetTopItemsInList(userId: string, rawArgs: unknown): Promise<string> {
  const args = parseTopItemsArgs(rawArgs);
  if (!args) {
    return JSON.stringify({ error: "invalid_arguments" });
  }

  try {
    const result = await getTopItemsInList(userId, args.list, args.limit);
    if (!result) {
      const available = await listClasserNames(userId);
      return JSON.stringify({ error: "no_matching_list", available });
    }
    return JSON.stringify({
      list: result.listName,
      count: result.items.length,
      items: result.items.map((item) => ({
        rank: item.rank,
        name: item.name,
        description: item.description,
      })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

export const classerTopItemsTool: RegisteredTool = {
  definition: GET_TOP_ITEMS_TOOL,
  execute: executeGetTopItemsInList,
};

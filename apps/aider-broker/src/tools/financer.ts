import type { RegisteredTool, ToolDefinition } from "../types";
import { type CurrentAssetsData, getCurrentAssets } from "./financer-query";

export const GET_CURRENT_ASSETS_TOOL_NAME = "get_current_assets";

// Cap on asset sources listed, so a large portfolio can't overflow context.
const MAX_SOURCES = 50;

export const GET_CURRENT_ASSETS_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: GET_CURRENT_ASSETS_TOOL_NAME,
    description:
      "Get the total value of the user's current assets / net worth (the Financer app), for the " +
      "current month, converted into their home currency, with a per-source breakdown. Use this when " +
      "the user asks how much their assets, savings, or net worth are worth right now, e.g. 'what is " +
      "the value of my current assets'. Takes no arguments. Never answer from memory; always call " +
      "this tool. Lists at most 50 sources.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
};

function currentMonthUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// Convert an amount from `from` currency into `home` using the USD-based rate
// map, mirroring the app formula amount * (rate[home] / rate[from]). Falls back
// to the raw amount when either rate is missing.
function convert(
  amount: number,
  from: string,
  home: string,
  rates: Record<string, number>
): number {
  const rateFrom = rates[from];
  const rateHome = rates[home];
  if (rateFrom == null || rateHome == null) return amount;
  return amount * (rateHome / rateFrom);
}

export async function executeGetCurrentAssets(userId: string, _rawArgs: unknown): Promise<string> {
  const month = currentMonthUTC();

  try {
    const data: CurrentAssetsData = await getCurrentAssets(userId, month);
    const total = data.rows.reduce(
      (sum, row) => sum + convert(row.value, row.currency, data.homeCurrency, data.rates),
      0
    );

    return JSON.stringify({
      month,
      home_currency: data.homeCurrency,
      total: roundToCents(total),
      by_source: data.rows.slice(0, MAX_SOURCES).map((row) => ({
        name: row.name,
        value: row.value,
        currency: row.currency,
      })),
    });
  } catch {
    return JSON.stringify({ error: "lookup_failed" });
  }
}

export const financerAssetsTool: RegisteredTool = {
  definition: GET_CURRENT_ASSETS_TOOL,
  execute: executeGetCurrentAssets,
  keywords: ["asset", "assets", "net worth", "networth", "savings", "portfolio", "worth", "wealth"],
};

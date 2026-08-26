import type { RegisteredTool, ToolDefinition } from "../types";
import { classerTopItemsTool } from "./classer";
import { financerAssetsTool } from "./financer";
import { gainerExercisesTool, gainerWorkoutsTool } from "./gainer";
import { journalerMediaTool } from "./journaler";
import { routinerLogCountTool } from "./routiner";

// The single source of tools the broker offers to the model and dispatches
// from. Adding an app's tool is a new `./<app>.ts` module plus one line here —
// no dispatch code changes. Keep tool scopes non-overlapping so their "use
// when…" descriptions don't compete for selection.
const REGISTERED_TOOLS: RegisteredTool[] = [
  gainerWorkoutsTool,
  gainerExercisesTool,
  classerTopItemsTool,
  financerAssetsTool,
  journalerMediaTool,
  routinerLogCountTool,
];

export const TOOL_REGISTRY: ReadonlyMap<string, RegisteredTool> = new Map(
  REGISTERED_TOOLS.map((tool) => [tool.definition.function.name, tool])
);

export const AVAILABLE_TOOLS: ToolDefinition[] = REGISTERED_TOOLS.map((tool) => tool.definition);

/**
 * Narrow the toolset offered to the model for a given user message. Small local
 * models (llama3.1:8b) reliably call a tool when shown one or two, but stop
 * calling any when shown the whole set, so we offer only the tools whose
 * keywords appear in the message. When nothing matches — a casual, non-data
 * question, or a domain we don't have keywords for — we fall back to offering
 * every tool (the model then simply answers normally, as before).
 */
export function selectToolsForMessage(message: string): ToolDefinition[] {
  const text = message.toLowerCase();
  const matched = REGISTERED_TOOLS.filter((tool) =>
    tool.keywords.some((keyword) => text.includes(keyword))
  );
  const chosen = matched.length > 0 ? matched : REGISTERED_TOOLS;
  return chosen.map((tool) => tool.definition);
}

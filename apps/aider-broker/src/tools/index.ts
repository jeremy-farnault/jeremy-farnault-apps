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

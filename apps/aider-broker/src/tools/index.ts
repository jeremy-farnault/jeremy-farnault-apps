import type { RegisteredTool, ToolDefinition } from "../types";
import { gainerWorkoutsTool } from "./gainer";

// The single source of tools the broker offers to the model and dispatches
// from. Adding an app's tool is a new `./<app>.ts` module plus one line here —
// no dispatch code changes.
const REGISTERED_TOOLS: RegisteredTool[] = [gainerWorkoutsTool];

export const TOOL_REGISTRY: ReadonlyMap<string, RegisteredTool> = new Map(
  REGISTERED_TOOLS.map((tool) => [tool.definition.function.name, tool])
);

export const AVAILABLE_TOOLS: ToolDefinition[] = REGISTERED_TOOLS.map((tool) => tool.definition);

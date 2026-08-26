export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ToolCall {
  function: {
    name: string;
    // Ollama's wire format for this field is unverified against the real
    // installed version — may come back as a JSON object or a JSON-encoded
    // string. Kept as `unknown` so every call site normalizes it explicitly.
    arguments: unknown;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
}

export interface ChatRequestBody {
  model: string;
  messages: ChatMessage[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// A self-describing tool unit: its model-facing definition paired with the
// executor the registry dispatches to. `execute` returns a JSON string so the
// server's message-assembly and streaming loop stay tool-agnostic.
export interface RegisteredTool {
  definition: ToolDefinition;
  execute: (userId: string, rawArgs: unknown) => Promise<string>;
  // Lowercase substrings that, when found in the user's message, mark this tool
  // as relevant. Used to narrow the toolset offered to the model per request —
  // small local models stop calling tools reliably when handed too many at once.
  keywords: string[];
}

export type BrokerStreamEvent =
  | { type: "meta"; model: string }
  // `arguments` is the raw JSON the model passed to the tool (stringified), so
  // the client can show what was actually requested — the direct antidote to
  // "did it use my data or make it up?". Generic across all tools.
  | { type: "tool"; name: string; arguments?: string }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

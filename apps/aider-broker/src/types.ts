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

export type BrokerStreamEvent =
  | { type: "meta"; model: string }
  // `arguments` is the raw JSON the model passed to the tool (stringified), so
  // the client can show what was actually requested — the direct antidote to
  // "did it use my data or make it up?". Generic across all tools.
  | { type: "tool"; name: string; arguments?: string }
  | { type: "token"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

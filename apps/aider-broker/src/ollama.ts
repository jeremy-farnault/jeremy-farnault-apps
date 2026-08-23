import type { ChatMessage, ToolCall, ToolDefinition } from "./types";

export class OllamaError extends Error {}

interface OllamaChatLine {
  message?: { content?: string };
  done?: boolean;
}

export async function* streamOllamaChat(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok || !res.body) {
    throw new OllamaError(`Ollama responded ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) return;

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        const parsed = JSON.parse(line) as OllamaChatLine;
        if (parsed.message?.content) yield parsed.message.content;
        if (parsed.done) return;
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }
}

export interface OllamaToolDecision {
  content: string;
  toolCalls: ToolCall[];
}

interface OllamaChatResponse {
  message?: { content?: string; tool_calls?: ToolCall[] };
}

// Non-streaming on purpose: how tool_calls interacts with `stream: true` is
// unverified against the real Ollama instance, and a single JSON response is
// simpler and safer to parse correctly than guessing at streamed chunk shape.
export async function requestOllamaToolDecision(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  signal?: AbortSignal
): Promise<OllamaToolDecision> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, tools, stream: false }),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    throw new OllamaError(`Ollama responded ${res.status}`);
  }

  const body = (await res.json()) as OllamaChatResponse;
  return {
    content: body.message?.content ?? "",
    toolCalls: body.message?.tool_calls ?? [],
  };
}

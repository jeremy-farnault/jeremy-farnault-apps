import type { ChatMessage } from "./types";

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

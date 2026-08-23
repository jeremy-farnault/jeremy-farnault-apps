import type { ChatMessage } from "./types";

// Kept short on purpose: a long system prompt slows first-token latency on the
// smaller local models, which are already the bottleneck on Pi hardware.
export const PERSONA_SYSTEM_PROMPT =
  "You are Aider, a friendly, concise home assistant. Keep answers clear and to the point.";

// Folded into the single leading system message rather than appended as a
// second, later system message: confirmed against the real Pi-hosted
// llama3.1:8b that a trailing system message (even one placed right after the
// user turn) makes the model roleplay a fake tool call in plain text instead
// of emitting a real one. One leading system message is both required for
// tool-calling to work at all and the only way the model can resolve a
// relative date range ("this week") into real dates.
export function withPersona(messages: ChatMessage[]): ChatMessage[] {
  if (messages.some((message) => message.role === "system")) return messages;
  const today = new Date().toISOString().slice(0, 10);
  return [
    { role: "system", content: `${PERSONA_SYSTEM_PROMPT} Today's date is ${today}.` },
    ...messages,
  ];
}

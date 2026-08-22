import type { ChatMessage, RouteDecision, RouteModels } from "./types";

// v1 keyword heuristic: cheap, deterministic, fully unit-testable. Ticket 8 adds a
// real DB tool with real tool-calling, which may replace this with model-driven
// tool selection instead of a keyword classifier.
export const DATA_KEYWORDS = [
  "how many",
  "how much",
  "how often",
  "on average",
  "average",
  "total",
  "compare",
  "trend",
  "history",
  "log",
  "logged",
  "record",
  "records",
  "workout",
  "workouts",
  "trained",
  "training session",
  "exercise",
  "weight",
  "sleep",
  "steps",
  "calories",
  "mood",
  "spent",
  "spending",
  "budget",
  "expense",
  "expenses",
  "this week",
  "last week",
  "this month",
  "last month",
  "this year",
  "my data",
  "my history",
  "did i",
  "have i",
  "when did i",
] as const;

export const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/;
export const RELATIVE_RANGE_PATTERN = /\b(this|last|past)\s+(week|month|year)\b/i;

function findLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.role === "user") return message;
  }
  return undefined;
}

function looksLikeDataQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  if (DATA_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
  if (DATE_PATTERN.test(lower)) return true;
  if (RELATIVE_RANGE_PATTERN.test(lower)) return true;
  return false;
}

export function classifyIntent(messages: ChatMessage[], models: RouteModels): RouteDecision {
  const latestUserMessage = findLatestUserMessage(messages);
  const route =
    latestUserMessage && looksLikeDataQuestion(latestUserMessage.content) ? "data" : "curiosity";
  return { route, model: models[route] };
}

import { describe, expect, it } from "vitest";
import { classifyIntent } from "./routing";
import type { ChatMessage, RouteModels } from "./types";

const models: RouteModels = {
  curiosity: "qwen2.5:3b-instruct",
  data: "llama3.1:8b",
};

function userMessage(content: string): ChatMessage[] {
  return [{ role: "user", content }];
}

describe("classifyIntent", () => {
  it.each([
    "why is the sky blue?",
    "how does photosynthesis work",
    "tell me a fun fact about octopuses",
    "can you help me understand fractions",
  ])("routes curiosity-ish message %j to curiosity", (content) => {
    expect(classifyIntent(userMessage(content), models)).toEqual({
      route: "curiosity",
      model: models.curiosity,
    });
  });

  it.each([
    "how many times did I train this week?",
    "what's my average sleep this month",
    "how much did I spend on groceries last week",
    "did I log a workout on 2026-08-20?",
    "compare my training last month to this month",
  ])("routes data-ish message %j to data", (content) => {
    expect(classifyIntent(userMessage(content), models)).toEqual({
      route: "data",
      model: models.data,
    });
  });

  it("defaults to curiosity when there is no message at all", () => {
    expect(classifyIntent([], models)).toEqual({
      route: "curiosity",
      model: models.curiosity,
    });
  });

  it("defaults to curiosity when there is no user-role message", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "how many workouts did the user log this week?" },
      { role: "assistant", content: "I can help with that." },
    ];
    expect(classifyIntent(messages, models)).toEqual({
      route: "curiosity",
      model: models.curiosity,
    });
  });

  it("only looks at the latest user message, not earlier ones", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "how many times did I train this week?" },
      { role: "assistant", content: "You trained 3 times." },
      { role: "user", content: "thanks, why is the ocean salty?" },
    ];
    expect(classifyIntent(messages, models)).toEqual({
      route: "curiosity",
      model: models.curiosity,
    });
  });

  it("uses the models passed in, not hardcoded model names", () => {
    const customModels: RouteModels = { curiosity: "custom-fast", data: "custom-slow" };
    expect(classifyIntent(userMessage("hi there"), customModels)).toEqual({
      route: "curiosity",
      model: "custom-fast",
    });
    expect(classifyIntent(userMessage("how many workouts this week?"), customModels)).toEqual({
      route: "data",
      model: "custom-slow",
    });
  });
});

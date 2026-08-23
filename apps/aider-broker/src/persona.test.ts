import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONA_SYSTEM_PROMPT, withPersona } from "./persona";
import type { ChatMessage } from "./types";

describe("withPersona", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prepends the persona system prompt with today's date when no system message is present", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
    expect(withPersona(messages)).toEqual([
      { role: "system", content: `${PERSONA_SYSTEM_PROMPT} Today's date is 2026-08-23.` },
      { role: "user", content: "hi" },
    ]);
  });

  it("leaves messages untouched when a system message already exists", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "custom persona" },
      { role: "user", content: "hi" },
    ];
    expect(withPersona(messages)).toEqual(messages);
  });
});

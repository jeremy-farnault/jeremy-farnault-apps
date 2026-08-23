import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OllamaError, requestOllamaToolDecision } from "./ollama";
import type { ToolDefinition } from "./types";

const tools: ToolDefinition[] = [
  {
    type: "function",
    function: { name: "get_workouts_in_range", description: "test", parameters: {} },
  },
];

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestOllamaToolDecision", () => {
  it("sends a non-streaming request with the tools attached", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: { content: "hi" } }));

    await requestOllamaToolDecision("http://ollama.invalid", "capable-model", [], tools);

    expect(fetch).toHaveBeenCalledWith(
      "http://ollama.invalid/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model: "capable-model", messages: [], tools, stream: false }),
      })
    );
  });

  // Ollama's exact tool-calling response shape wasn't verified against the
  // real installed version — these two cases pin down that both an object
  // and a JSON-encoded string for `arguments` pass through unmodified.
  it("passes through tool_calls with object arguments unmodified", async () => {
    const toolCalls = [
      { function: { name: "get_workouts_in_range", arguments: { start_date: "2026-08-01" } } },
    ];
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: { content: "", tool_calls: toolCalls } })
    );

    const result = await requestOllamaToolDecision(
      "http://ollama.invalid",
      "capable-model",
      [],
      tools
    );

    expect(result.toolCalls).toEqual(toolCalls);
  });

  it("passes through tool_calls with string-encoded arguments unmodified", async () => {
    const toolCalls = [
      {
        function: {
          name: "get_workouts_in_range",
          arguments: '{"start_date":"2026-08-01"}',
        },
      },
    ];
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: { content: "", tool_calls: toolCalls } })
    );

    const result = await requestOllamaToolDecision(
      "http://ollama.invalid",
      "capable-model",
      [],
      tools
    );

    expect(result.toolCalls).toEqual(toolCalls);
  });

  it("defaults to an empty toolCalls array when the response has none", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: { content: "just an answer" } }));

    const result = await requestOllamaToolDecision(
      "http://ollama.invalid",
      "capable-model",
      [],
      tools
    );

    expect(result).toEqual({ content: "just an answer", toolCalls: [] });
  });

  it("throws OllamaError on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 500));

    await expect(
      requestOllamaToolDecision("http://ollama.invalid", "capable-model", [], tools)
    ).rejects.toThrow(OllamaError);
  });
});

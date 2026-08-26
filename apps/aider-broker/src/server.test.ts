import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrokerConfig } from "./config";

vi.mock("./ollama", () => ({
  streamOllamaChat: vi.fn(),
  requestOllamaToolDecision: vi.fn(),
}));

vi.mock("./tools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tools")>();
  return { ...actual, executeGetWorkoutsInRange: vi.fn() };
});

import { requestOllamaToolDecision, streamOllamaChat } from "./ollama";
import { PERSONA_SYSTEM_PROMPT } from "./persona";
import { createBrokerServer } from "./server";
import { AVAILABLE_TOOLS, GET_WORKOUTS_TOOL_NAME, executeGetWorkoutsInRange } from "./tools";

const mockedStreamOllamaChat = vi.mocked(streamOllamaChat);
const mockedRequestOllamaToolDecision = vi.mocked(requestOllamaToolDecision);
const mockedExecuteGetWorkoutsInRange = vi.mocked(executeGetWorkoutsInRange);

const PERSONA_WITH_DATE = `${PERSONA_SYSTEM_PROMPT} Today's date is 2026-08-23.`;

const config: BrokerConfig = {
  port: 0,
  sharedSecret: "test-secret",
  ollamaUrl: "http://ollama.invalid",
  databaseUrl: "postgresql://test",
  models: { fast: "fast-model", capable: "capable-model" },
};

let baseUrl: string;
let server: ReturnType<typeof createBrokerServer>;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));
  mockedStreamOllamaChat.mockReset();
  mockedRequestOllamaToolDecision.mockReset();
  mockedRequestOllamaToolDecision.mockResolvedValue({ content: "", toolCalls: [] });
  mockedExecuteGetWorkoutsInRange.mockReset();
  server = createBrokerServer(config);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  vi.useRealTimers();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function authedFetch(path: string, init: RequestInit = {}, userId = "user-1"): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: "Bearer test-secret",
      "X-Aider-User-Id": userId,
    },
  });
}

async function readNdjsonLines(res: Response): Promise<unknown[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

describe("GET /health", () => {
  it("returns 401 without a bearer token", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with models when authorized", async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Authorization: "Bearer test-secret" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      service: "aider-broker",
      models: config.models,
    });
  });
});

describe("POST /v1/chat", () => {
  it("returns 401 without a bearer token and never calls Ollama", async () => {
    const res = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      body: JSON.stringify({ model: "fast-model", messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(401);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("returns 400 when X-Aider-User-Id is missing", async () => {
    const res = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
      body: JSON.stringify({ model: "fast-model", messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(400);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed body", async () => {
    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ nope: true }),
    });
    expect(res.status).toBe(400);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("returns 400 when model is missing", async () => {
    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(400);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("returns 400 for a model that isn't one of the configured models", async () => {
    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "some-other-model",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    expect(res.status).toBe(400);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("uses the requested model verbatim and streams tokens when no tool is called", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "Hello";
      yield " there";
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "capable-model",
        messages: [{ role: "user", content: "why is the sky blue?" }],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readNdjsonLines(res);
    expect(events[0]).toEqual({ type: "meta", model: "capable-model" });
    expect(events).toContainEqual({ type: "token", content: "Hello" });
    expect(events).toContainEqual({ type: "token", content: " there" });
    expect(events[events.length - 1]).toEqual({ type: "done" });
    expect(events).not.toContainEqual(expect.objectContaining({ type: "tool" }));

    expect(mockedExecuteGetWorkoutsInRange).not.toHaveBeenCalled();
    expect(mockedStreamOllamaChat).toHaveBeenCalledWith(
      config.ollamaUrl,
      "capable-model",
      [
        { role: "system", content: PERSONA_WITH_DATE },
        { role: "user", content: "why is the sky blue?" },
      ],
      expect.anything()
    );
  });

  it("falls back to normal streaming when the tool-decision call rejects", async () => {
    mockedRequestOllamaToolDecision.mockRejectedValue(new Error("model does not support tools"));
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "fine either way";
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "fast-model",
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    expect(res.status).toBe(200);
    const events = await readNdjsonLines(res);
    expect(events).toContainEqual({ type: "token", content: "fine either way" });
    expect(mockedExecuteGetWorkoutsInRange).not.toHaveBeenCalled();
    expect(mockedStreamOllamaChat).toHaveBeenCalledWith(
      config.ollamaUrl,
      "fast-model",
      [
        { role: "system", content: PERSONA_WITH_DATE },
        { role: "user", content: "hi" },
      ],
      expect.anything()
    );
  });

  it("executes the workouts tool and appends the result before the final answer", async () => {
    const toolCall = {
      function: {
        name: GET_WORKOUTS_TOOL_NAME,
        arguments: { start_date: "2026-08-17", end_date: "2026-08-23" },
      },
    };
    mockedRequestOllamaToolDecision.mockResolvedValue({ content: "", toolCalls: [toolCall] });
    mockedExecuteGetWorkoutsInRange.mockResolvedValue('{"count":1,"sessions":[]}');
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "You trained once.";
    });

    const res = await authedFetch(
      "/v1/chat",
      {
        method: "POST",
        body: JSON.stringify({
          model: "capable-model",
          messages: [{ role: "user", content: "how many times did I train this week?" }],
        }),
      },
      "user-42"
    );

    expect(res.status).toBe(200);
    const events = await readNdjsonLines(res);
    expect(events[0]).toEqual({ type: "meta", model: "capable-model" });
    // The tool event carries the model's raw arguments (stringified) so the
    // client can show exactly what was requested.
    expect(events).toContainEqual({
      type: "tool",
      name: GET_WORKOUTS_TOOL_NAME,
      arguments: JSON.stringify({ start_date: "2026-08-17", end_date: "2026-08-23" }),
    });
    expect(events).toContainEqual({ type: "token", content: "You trained once." });

    expect(mockedExecuteGetWorkoutsInRange).toHaveBeenCalledWith("user-42", {
      start_date: "2026-08-17",
      end_date: "2026-08-23",
    });

    // The persona system message must stay the ONLY (and leading) system
    // message — confirmed against the real Pi-hosted llama3.1:8b that a
    // second, later system message makes it roleplay a fake tool call in
    // plain text instead of emitting a real one.
    expect(mockedRequestOllamaToolDecision).toHaveBeenCalledWith(
      config.ollamaUrl,
      "capable-model",
      [
        { role: "system", content: PERSONA_WITH_DATE },
        { role: "user", content: "how many times did I train this week?" },
      ],
      AVAILABLE_TOOLS,
      expect.anything()
    );

    expect(mockedStreamOllamaChat).toHaveBeenCalledWith(
      config.ollamaUrl,
      "capable-model",
      [
        { role: "system", content: PERSONA_WITH_DATE },
        { role: "user", content: "how many times did I train this week?" },
        { role: "assistant", content: "", tool_calls: [toolCall] },
        { role: "tool", content: '{"count":1,"sessions":[]}' },
      ],
      expect.anything()
    );
  });

  it("still produces a streamed answer if the tool execution itself throws", async () => {
    mockedRequestOllamaToolDecision.mockResolvedValue({
      content: "",
      toolCalls: [
        {
          function: { name: GET_WORKOUTS_TOOL_NAME, arguments: { start_date: "x", end_date: "y" } },
        },
      ],
    });
    mockedExecuteGetWorkoutsInRange.mockRejectedValue(new Error("db down"));
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "sorry, something went wrong";
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "capable-model",
        messages: [{ role: "user", content: "how many times did I train this week?" }],
      }),
    });

    expect(res.status).toBe(200);
    const events = await readNdjsonLines(res);
    expect(events).toContainEqual({ type: "token", content: "sorry, something went wrong" });
  });

  it("does not add a persona message when the caller already supplied a system message", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "ok";
    });

    await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        model: "fast-model",
        messages: [
          { role: "system", content: "custom persona" },
          { role: "user", content: "hi" },
        ],
      }),
    });

    expect(mockedStreamOllamaChat).toHaveBeenCalledWith(
      config.ollamaUrl,
      "fast-model",
      [
        { role: "system", content: "custom persona" },
        { role: "user", content: "hi" },
      ],
      expect.anything()
    );
  });

  it("streams a 200 with an in-band error event when Ollama is unreachable before any bytes", async () => {
    // The response commits to 200 + `meta` up front (so time-to-first-byte never
    // trips a downstream timeout during a cold model load), so an upstream failure
    // with no tokens surfaces as a terminal `error` event rather than a 502 status.
    // biome-ignore lint/correctness/useYield: simulates an immediate upstream failure with no tokens
    mockedStreamOllamaChat.mockImplementation(async function* () {
      throw new Error("connection refused");
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ model: "fast-model", messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    const events = await readNdjsonLines(res);
    expect(events[0]).toEqual({ type: "meta", model: "fast-model" });
    expect(events).not.toContainEqual(expect.objectContaining({ type: "token" }));
    expect(events[events.length - 1]).toEqual({
      type: "error",
      message: "Model backend error",
    });
  });

  it("emits an in-band error event and still terminates if Ollama fails mid-stream", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "partial answer";
      throw new Error("stream broke");
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ model: "fast-model", messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    const events = await readNdjsonLines(res);
    expect(events).toContainEqual({ type: "token", content: "partial answer" });
    expect(events[events.length - 1]).toEqual({
      type: "error",
      message: "Model backend error",
    });
  });
});

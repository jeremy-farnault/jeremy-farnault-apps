import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrokerConfig } from "./config";

vi.mock("./ollama", () => ({
  streamOllamaChat: vi.fn(),
}));

import { streamOllamaChat } from "./ollama";
import { createBrokerServer } from "./server";

const mockedStreamOllamaChat = vi.mocked(streamOllamaChat);

const config: BrokerConfig = {
  port: 0,
  sharedSecret: "test-secret",
  ollamaUrl: "http://ollama.invalid",
  models: { curiosity: "curiosity-model", data: "data-model" },
};

let baseUrl: string;
let server: ReturnType<typeof createBrokerServer>;

beforeEach(async () => {
  mockedStreamOllamaChat.mockReset();
  server = createBrokerServer(config);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
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
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(401);
    expect(mockedStreamOllamaChat).not.toHaveBeenCalled();
  });

  it("returns 400 when X-Aider-User-Id is missing", async () => {
    const res = await fetch(`${baseUrl}/v1/chat`, {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
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

  it("routes a curiosity-ish message to the curiosity model and streams tokens", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "Hello";
      yield " there";
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "why is the sky blue?" }] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const events = await readNdjsonLines(res);
    expect(events[0]).toEqual({ type: "meta", route: "curiosity", model: "curiosity-model" });
    expect(events).toContainEqual({ type: "token", content: "Hello" });
    expect(events).toContainEqual({ type: "token", content: " there" });
    expect(events[events.length - 1]).toEqual({ type: "done" });

    expect(mockedStreamOllamaChat).toHaveBeenCalledWith(
      config.ollamaUrl,
      "curiosity-model",
      [{ role: "user", content: "why is the sky blue?" }],
      expect.anything()
    );
  });

  it("routes a data-ish message to the data model", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "You trained 3 times.";
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "how many times did I train this week?" }],
      }),
    });

    const events = await readNdjsonLines(res);
    expect(events[0]).toEqual({ type: "meta", route: "data", model: "data-model" });
  });

  it("returns 502 when Ollama is unreachable before any bytes stream", async () => {
    // biome-ignore lint/correctness/useYield: simulates an immediate upstream failure with no tokens
    mockedStreamOllamaChat.mockImplementation(async function* () {
      throw new Error("connection refused");
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(502);
  });

  it("emits an in-band error event and still terminates if Ollama fails mid-stream", async () => {
    mockedStreamOllamaChat.mockImplementation(async function* () {
      yield "partial answer";
      throw new Error("stream broke");
    });

    const res = await authedFetch("/v1/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
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

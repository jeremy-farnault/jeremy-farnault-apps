import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@jf/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { auth } from "@jf/auth";
import { GET, POST } from "./route";

const mockedGetSession = vi.mocked(auth.api.getSession);
const originalFetch = global.fetch;

function makeRequest(body?: unknown, method = "POST"): NextRequest {
  return new NextRequest("http://localhost:3015/api/chat", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function sessionWithUserId(userId: string) {
  return { user: { id: userId } } as unknown as Awaited<ReturnType<typeof auth.api.getSession>>;
}

beforeEach(() => {
  mockedGetSession.mockReset();
  process.env.AIDER_PI_URL = "https://aider-pi.example.com";
  process.env.AIDER_PI_SHARED_SECRET = "test-secret";
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("GET /api/chat", () => {
  it("returns 401 when there is no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await GET(makeRequest(undefined, "GET"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/chat", () => {
  it("returns 401 when there is no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed body", async () => {
    mockedGetSession.mockResolvedValue(sessionWithUserId("user-1"));
    const res = await POST(makeRequest({ nope: true }));
    expect(res.status).toBe(400);
  });

  it("forwards the bearer secret and the session's userId as X-Aider-User-Id, never a body-supplied one", async () => {
    mockedGetSession.mockResolvedValue(sessionWithUserId("user-1"));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new ReadableStream(), { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await POST(
      makeRequest({
        messages: [{ role: "user", content: "hi" }],
        userId: "attacker-supplied-id",
      })
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://aider-pi.example.com/v1/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret",
          "X-Aider-User-Id": "user-1",
        }),
      })
    );
  });

  it("returns 502 when the Pi is unreachable", async () => {
    mockedGetSession.mockResolvedValue(sessionWithUserId("user-1"));
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const res = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(502);
  });

  it("streams the Pi's NDJSON response body through unchanged", async () => {
    mockedGetSession.mockResolvedValue(sessionWithUserId("user-1"));
    const upstreamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"type":"meta"}\n'));
        controller.close();
      },
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      })
    ) as unknown as typeof fetch;

    const res = await POST(makeRequest({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const text = await res.text();
    expect(text).toBe('{"type":"meta"}\n');
  });
});

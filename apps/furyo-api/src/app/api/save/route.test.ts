import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The routes run against an in-process Postgres (PGlite) with the real migration, so the
// conditional update is tested as SQL, not as a fake.
vi.mock("@jf/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@jf/db")>()),
  ...(await (await import("@/test/pglite")).testDb()),
}));

vi.mock("@jf/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { auth } from "@jf/auth";
import * as dbModule from "@jf/db";
import { DELETE, GET, OPTIONS, PUT } from "./route";

const GAME = "https://furyodachi.jeremyfarnault.com";
const mockedGetSession = vi.mocked(auth.api.getSession);
const testClient = (dbModule as unknown as { testClient: { exec(sql: string): Promise<unknown> } })
  .testClient;

function request(method: string, body?: unknown, origin: string | null = GAME): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new NextRequest("https://furyo-api.jeremyfarnault.com/api/save", {
    method,
    headers,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

function loggedInAs(userId: string | null) {
  mockedGetSession.mockResolvedValue(
    (userId ? { user: { id: userId } } : null) as unknown as Awaited<
      ReturnType<typeof auth.api.getSession>
    >
  );
}

const ken = { version: 12, name: "Ken", stats: { belly: 80 } };

beforeEach(async () => {
  mockedGetSession.mockReset();
  loggedInAs("user-1");
  await testClient.exec("DELETE FROM furyo_saves");
});

describe("CORS", () => {
  it("answers the game's preflight with credentials allowed", async () => {
    const res = await OPTIONS(request("OPTIONS"));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(GAME);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-allow-methods")).toContain("PUT");
  });

  it("refuses another origin's preflight and requests", async () => {
    expect((await OPTIONS(request("OPTIONS", undefined, "https://evil.example.com"))).status).toBe(
      403
    );
    const res = await GET(request("GET", undefined, "https://noter.jeremyfarnault.com"));
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows localhost outside production, for the game's dev server", async () => {
    const res = await OPTIONS(request("OPTIONS", undefined, "http://localhost:5173"));
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("refuses localhost in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect((await OPTIONS(request("OPTIONS", undefined, "http://localhost:5173"))).status).toBe(
        403
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("puts the CORS headers on a 401, so the game can read it as 'not logged in'", async () => {
    loggedInAs(null);
    const res = await GET(request("GET"));
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(GAME);
  });
});

describe("GET /api/save", () => {
  it("returns null before the first save", async () => {
    const res = await GET(request("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: null });
    expect(res.headers.get("access-control-allow-origin")).toBe(GAME);
  });
});

describe("PUT /api/save", () => {
  it("returns 401 without a session and stores nothing", async () => {
    loggedInAs(null);
    expect((await PUT(request("PUT", { state: ken, expectedVersion: 0 }))).status).toBe(401);
    loggedInAs("user-1");
    expect(await (await GET(request("GET"))).json()).toEqual({ saved: null });
  });

  it("round-trips a save", async () => {
    const res = await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ version: 1 });
    expect(await (await GET(request("GET"))).json()).toEqual({ saved: { state: ken, version: 1 } });
  });

  it("bumps the version on each save", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    const res = await PUT(request("PUT", { state: { ...ken, name: "Ken 2" }, expectedVersion: 1 }));
    expect(await res.json()).toEqual({ version: 2 });
  });

  it("returns a conflict for a stale expected version, and keeps the newer save", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    const newer = { ...ken, name: "Newer" };
    await PUT(request("PUT", { state: newer, expectedVersion: 1 }));
    const stale = await PUT(request("PUT", { state: ken, expectedVersion: 1 }));
    expect(stale.status).toBe(409);
    expect(await (await GET(request("GET"))).json()).toEqual({
      saved: { state: newer, version: 2 },
    });
  });

  it("returns a conflict for a first save when one already exists", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    expect((await PUT(request("PUT", { state: { other: true }, expectedVersion: 0 }))).status).toBe(
      409
    );
  });

  it("lets only one of two saves from the same version win", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    const [a, b] = await Promise.all([
      PUT(request("PUT", { state: { tab: "a" }, expectedVersion: 1 })),
      PUT(request("PUT", { state: { tab: "b" }, expectedVersion: 1 })),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const { saved } = await (await GET(request("GET"))).json();
    expect(saved.version).toBe(2);
  });

  it("keeps each user's furyo separate, by the session's user, never the body", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0, userId: "user-2" }));
    loggedInAs("user-2");
    expect(await (await GET(request("GET"))).json()).toEqual({ saved: null });
  });

  it.each([
    ["not JSON", "{nope"],
    ["no state", { expectedVersion: 0 }],
    ["a state that isn't an object", { state: [1], expectedVersion: 0 }],
    ["no version", { state: ken }],
    ["a negative version", { state: ken, expectedVersion: -1 }],
    ["a fractional version", { state: ken, expectedVersion: 1.5 }],
  ])("returns 400 for %s", async (_name, body) => {
    expect((await PUT(request("PUT", body))).status).toBe(400);
  });

  it("returns 413 for a body far bigger than a furyo", async () => {
    const huge = { state: { blob: "x".repeat(300 * 1024) }, expectedVersion: 0 };
    expect((await PUT(request("PUT", huge))).status).toBe(413);
  });
});

describe("DELETE /api/save", () => {
  it("clears the save", async () => {
    await PUT(request("PUT", { state: ken, expectedVersion: 0 }));
    expect((await DELETE(request("DELETE"))).status).toBe(204);
    expect(await (await GET(request("GET"))).json()).toEqual({ saved: null });
  });
});

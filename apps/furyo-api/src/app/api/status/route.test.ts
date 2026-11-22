import { createFuryo } from "@jf/furyo-logic";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The status route against an in-process Postgres with the real migration, and the real
// (vendored) game logic: the furyo is caught up for real.
vi.mock("@jf/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@jf/db")>()),
  ...(await (await import("@/test/pglite")).testDb()),
}));

vi.mock("@jf/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

import { saveState } from "@/lib/saves";
import { auth } from "@jf/auth";
import * as dbModule from "@jf/db";
import { GET, OPTIONS } from "./route";

const NOTER = "https://noter.jeremyfarnault.com";
const HOUR = 60 * 60 * 1000;
/** Wednesday 2026-11-18, 09:00 in Stockholm: awake, no calendar event for hours. */
const T0 = Date.UTC(2026, 10, 18, 8, 0);

const mockedGetSession = vi.mocked(auth.api.getSession);
const { db, testClient } = dbModule as unknown as {
  db: typeof dbModule.db;
  testClient: { exec(sql: string): Promise<unknown> };
};

function request(method = "GET", origin: string | null = NOTER): NextRequest {
  return new NextRequest("https://furyo-api.jeremyfarnault.com/api/status", {
    method,
    headers: origin ? { origin } : {},
  });
}

function loggedInAs(userId: string | null) {
  mockedGetSession.mockResolvedValue(
    (userId ? { user: { id: userId } } : null) as unknown as Awaited<
      ReturnType<typeof auth.api.getSession>
    >
  );
}

function ken(belly: number) {
  const state = createFuryo({ name: "Ken", gender: "male", timeZone: "Europe/Stockholm" }, T0);
  return { ...state, stats: { ...state.stats, stamina: 100, style: 100, belly } };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  mockedGetSession.mockReset();
  loggedInAs("user-1");
  await testClient.exec("DELETE FROM furyo_saves");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/status", () => {
  it("returns 401 without a session, with CORS headers so the badge can hide", async () => {
    loggedInAs(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(NOTER);
  });

  it("says there's no furyo before the first save", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "none" });
  });

  it("gives his name and no red dot when he's fine", async () => {
    await saveState(db, "user-1", ken(100), 0);
    expect(await (await GET(request())).json()).toEqual({
      status: "furyo",
      name: "Ken",
      needsYou: false,
      over: false,
    });
  });

  it("catches him up to now: a belly that has dropped under 25% since the save", async () => {
    await saveState(db, "user-1", ken(35), 0);
    expect(await (await GET(request())).json()).toMatchObject({ needsYou: false });
    vi.setSystemTime(T0 + 2 * HOUR);
    expect(await (await GET(request())).json()).toMatchObject({ needsYou: true });
  });

  it("doesn't save the caught-up furyo: the game's version is untouched", async () => {
    await saveState(db, "user-1", ken(35), 0);
    vi.setSystemTime(T0 + 2 * HOUR);
    await GET(request());
    expect(await saveState(db, "user-1", ken(35), 1)).toEqual({ ok: true, version: 2 });
  });

  it("is unknown for a save newer than the vendored logic", async () => {
    await saveState(db, "user-1", { ...ken(100), version: 999 }, 0);
    expect(await (await GET(request())).json()).toEqual({ status: "unknown" });
  });

  it("only reads the session user's furyo", async () => {
    await saveState(db, "user-2", ken(100), 0);
    expect(await (await GET(request())).json()).toEqual({ status: "none" });
  });
});

describe("CORS for the status route", () => {
  it.each([
    "https://noter.jeremyfarnault.com",
    "https://financer.jeremyfarnault.com",
    "https://jeremyfarnault.com",
    "https://furyodachi.jeremyfarnault.com",
  ])("lets %s read it, with credentials", async (origin) => {
    const pre = await OPTIONS(request("OPTIONS", origin));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(origin);
    expect(pre.headers.get("access-control-allow-credentials")).toBe("true");
    expect(pre.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
  });

  it.each([
    "https://evil.example.com",
    "https://jeremyfarnault.com.evil.example.com",
    "https://evil-jeremyfarnault.com",
    "http://noter.jeremyfarnault.com",
  ])("refuses %s", async (origin) => {
    expect((await OPTIONS(request("OPTIONS", origin))).status).toBe(403);
    expect((await GET(request("GET", origin))).status).toBe(403);
  });
});

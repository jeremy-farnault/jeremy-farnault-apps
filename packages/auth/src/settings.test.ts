import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stand-ins for the Drizzle queries, the cookie store and the session.
const query = vi.hoisted(() => ({
  rows: [] as { theme: string }[],
  limit: vi.fn(),
  values: vi.fn(),
  onConflictDoUpdate: vi.fn(),
  insert: vi.fn(),
  cookie: undefined as string | undefined,
  cookieSet: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@jf/db", () => ({
  userSettings: { userId: "user_settings.user_id", theme: "user_settings.theme" },
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: query.limit }) }) }),
    insert: query.insert,
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) =>
      name === "jf-theme" && query.cookie !== undefined ? { value: query.cookie } : undefined,
    set: query.cookieSet,
  }),
}));
vi.mock("./auth", () => ({ auth: { api: { getSession: query.getSession } } }));

import { THEME_COOKIE, type Theme } from "@jf/ui/theme";
import { getThemeCookie, getUserSettings, themeCookieOptions } from "./settings";
import { setTheme, syncThemeCookie } from "./settings-actions";

const ONE_YEAR = 60 * 60 * 24 * 365;

beforeEach(() => {
  query.rows = [];
  query.cookie = undefined;
  query.limit.mockImplementation(async () => query.rows);
  query.onConflictDoUpdate.mockResolvedValue(undefined);
  query.values.mockReturnValue({ onConflictDoUpdate: query.onConflictDoUpdate });
  query.insert.mockReturnValue({ values: query.values });
  query.getSession.mockResolvedValue({ user: { id: "user-1" } });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("getThemeCookie", () => {
  it("returns the cookie's theme", async () => {
    query.cookie = "dark";
    expect(await getThemeCookie()).toBe("dark");
  });

  it("falls back to System when the cookie is missing or invalid", async () => {
    expect(await getThemeCookie()).toBe("system");
    query.cookie = "sepia";
    expect(await getThemeCookie()).toBe("system");
  });
});

describe("getUserSettings", () => {
  it("returns the saved theme", async () => {
    query.rows = [{ theme: "dark" }];
    expect(await getUserSettings("user-1")).toEqual({ theme: "dark" });
  });

  it("falls back to System when the user has no row, without inserting one", async () => {
    expect(await getUserSettings("user-1")).toEqual({ theme: "system" });
    expect(query.insert).not.toHaveBeenCalled();
  });
});

describe("setTheme", () => {
  it("upserts the session user's row", async () => {
    await setTheme("dark");

    expect(query.values).toHaveBeenCalledWith({ userId: "user-1", theme: "dark" });
    expect(query.onConflictDoUpdate).toHaveBeenCalledWith({
      target: "user_settings.user_id",
      set: { theme: "dark", updatedAt: expect.any(Date) },
    });
  });

  it("writes the cookie on the shared domain when one is configured", async () => {
    vi.stubEnv("COOKIE_DOMAIN", ".example.com");
    await setTheme("light");

    expect(query.cookieSet).toHaveBeenCalledWith(THEME_COOKIE, "light", {
      domain: ".example.com",
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
      httpOnly: false,
      secure: false,
    });
  });

  it("writes a host-only cookie when no domain is configured", async () => {
    vi.stubEnv("COOKIE_DOMAIN", "");
    expect(themeCookieOptions()).not.toHaveProperty("domain");
  });

  it("rejects without a session and writes nothing", async () => {
    query.getSession.mockResolvedValue(null);

    await expect(setTheme("dark")).rejects.toThrow("Unauthorized");
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.cookieSet).not.toHaveBeenCalled();
  });

  it("rejects a value outside the enum without touching the row or the cookie", async () => {
    await expect(setTheme("sepia" as Theme)).rejects.toThrow("Invalid theme");
    expect(query.insert).not.toHaveBeenCalled();
    expect(query.cookieSet).not.toHaveBeenCalled();
  });
});

describe("syncThemeCookie", () => {
  it("does nothing signed out", async () => {
    query.getSession.mockResolvedValue(null);

    expect(await syncThemeCookie()).toBeNull();
    expect(query.limit).not.toHaveBeenCalled();
    expect(query.cookieSet).not.toHaveBeenCalled();
  });

  it("leaves a cookie that matches the row alone", async () => {
    query.rows = [{ theme: "dark" }];
    query.cookie = "dark";

    expect(await syncThemeCookie()).toBe("dark");
    expect(query.cookieSet).not.toHaveBeenCalled();
  });

  it("rewrites a stale cookie with the saved theme", async () => {
    query.rows = [{ theme: "light" }];
    query.cookie = "dark";

    expect(await syncThemeCookie()).toBe("light");
    expect(query.cookieSet).toHaveBeenCalledWith(THEME_COOKIE, "light", expect.any(Object));
  });

  it("writes a missing cookie, even for the default", async () => {
    expect(await syncThemeCookie()).toBe("system");
    expect(query.cookieSet).toHaveBeenCalledWith(THEME_COOKIE, "system", expect.any(Object));
  });
});

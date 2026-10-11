import { db, userSettings } from "@jf/db";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type Theme,
  parseTheme,
} from "@jf/ui/theme";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

// Server-only reads of the fleet-wide `user_settings` row. The write lives in
// `settings-actions.ts`: a "use server" module exposes every export as an action, and this
// read takes a raw userId, so it must never be one.

export type UserSettings = { theme: Theme };

const DEFAULT_SETTINGS: UserSettings = { theme: DEFAULT_THEME };

/** The user's settings, or the defaults when they have never changed one. Never inserts. */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await db
    .select({ theme: userSettings.theme })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row ?? DEFAULT_SETTINGS;
}

/** The theme preference the request's cookie carries: System when missing or invalid. */
export async function getThemeCookie(): Promise<Theme> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

/**
 * Options for the theme cookie. Set on the shared root domain when `COOKIE_DOMAIN` is
 * configured (like the session cookie), host-only otherwise for local dev. Not `httpOnly`:
 * the System-mode script reads it before paint.
 */
export function themeCookieOptions() {
  return {
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };
}

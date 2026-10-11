// Theme constants shared by the browser runtime (`theme-runtime.ts`) and @jf/auth's settings
// code. No DOM, no React, no server-only imports, so both sides can import it via the
// "@jf/ui/theme" entry.

export const THEMES = ["light", "dark", "system"] as const;

/** A theme *preference*: what the user picked. */
export type Theme = (typeof THEMES)[number];

/** What a preference comes out as on screen: System resolves to one of these. */
export type ResolvedTheme = "light" | "dark";

/** What a user with no saved preference, or a signed-out visitor, gets. */
export const DEFAULT_THEME: Theme = "system";

/**
 * The cookie holding a copy of the user's theme, shared across the fleet's subdomains so
 * every app renders the right theme before first paint without a database query. The
 * `user_settings` row stays the source of truth.
 */
export const THEME_COOKIE = "jf-theme";

/** About a year: the cookie is rewritten on every change, so it only lapses for idle users. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** A cookie value as a preference: anything missing or unknown is the default. */
export function parseTheme(value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

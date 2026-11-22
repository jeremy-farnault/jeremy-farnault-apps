/** The game's production origin, overridable for a preview deploy. */
function gameOrigin(): string {
  return process.env.FURYODACHI_ORIGIN ?? "https://furyodachi.jeremyfarnault.com";
}

const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Only the game may call these routes with the session cookie. Localhost is allowed outside
 * production, for the game's dev server against a local API: in production it would be useless
 * anyway, since the root-domain cookie isn't sent from localhost.
 */
export function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (origin === gameOrigin()) return true;
  return process.env.NODE_ENV !== "production" && LOCALHOST.test(origin);
}

/** Any of the apps on the shared root domain (and the root itself): the badge polls from each. */
const APP_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*jeremyfarnault\.com$/;

/**
 * Who may read the badge's status: every app, since the badge runs on each app's own origin.
 * It only returns the furyo's name and a red-dot flag, never the save.
 */
export function isAppOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (APP_ORIGIN.test(origin) || isAllowedOrigin(origin)) return true;
  return process.env.NODE_ENV !== "production" && LOCALHOST.test(origin);
}

export type OriginPolicy = (origin: string | null) => origin is string;

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function preflightHeaders(origin: string, methods: string): Record<string, string> {
  return {
    ...corsHeaders(origin),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
  };
}

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

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function preflightHeaders(origin: string): Record<string, string> {
  return {
    ...corsHeaders(origin),
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
  };
}

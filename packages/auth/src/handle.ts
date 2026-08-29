// Client-safe handle utilities. This module must stay free of server-only imports
// (no @jf/db, better-auth, resend, etc.) so it can be imported from client components
// (e.g. Exposer's onboarding form) via the "@jf/auth/handle" entry.

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
export const HANDLE_PATTERN = /^[a-z0-9-]+$/;

/**
 * Words a handle may not take, because they shadow application routes or common
 * system paths. Compared against the normalized (lowercase) handle.
 */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "api",
  "settings",
  "onboarding",
  "login",
  "logout",
  "signin",
  "signup",
  "sign-in",
  "sign-up",
  "admin",
  "static",
  "_next",
  "favicon",
  "robots",
  "sitemap",
  "manifest",
  "sw",
  "public",
  "assets",
  "images",
  "img",
  "icons",
  "new",
  "edit",
  "me",
  "index",
  "dashboard",
  "help",
  "about",
  "terms",
  "privacy",
  "exposer",
]);

/** Trim and lowercase — the canonical stored form of a handle. */
export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Returns a human-readable message for the first failing rule, or `null` when the
 * (normalized) handle is valid.
 */
export function getHandleError(input: string): string | null {
  const handle = normalizeHandle(input);

  if (handle.length === 0) {
    return "Handle is required.";
  }
  if (handle.length < HANDLE_MIN_LENGTH) {
    return `Handle must be at least ${HANDLE_MIN_LENGTH} characters.`;
  }
  if (handle.length > HANDLE_MAX_LENGTH) {
    return `Handle must be at most ${HANDLE_MAX_LENGTH} characters.`;
  }
  if (!HANDLE_PATTERN.test(handle)) {
    return "Handle may only contain lowercase letters, numbers, and hyphens.";
  }
  if (RESERVED_HANDLES.has(handle)) {
    return "That handle is reserved. Please choose another.";
  }
  return null;
}

/** Convenience boolean wrapper around {@link getHandleError}. */
export function isValidHandle(input: string): boolean {
  return getHandleError(input) === null;
}

/**
 * Best-effort default handle derived from a display name: accents dropped, lowercased,
 * with runs of disallowed characters collapsed to a single hyphen and edges trimmed,
 * truncated to the max length. May return "" or a sub-minimum string for pathological
 * names — the caller re-validates before submit.
 */
export function suggestHandleFromName(name: string): string {
  return name
    .normalize("NFKD") // split accented letters (é -> e + combining acute)
    .replace(/\p{Diacritic}/gu, "") // strip the combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of disallowed chars -> single hyphen
    .replace(/-+/g, "-") // collapse repeats
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    .slice(0, HANDLE_MAX_LENGTH)
    .replace(/-$/, ""); // truncation may leave a trailing hyphen
}

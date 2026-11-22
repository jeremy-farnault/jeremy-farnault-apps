import { db } from "@jf/db";
import { type NextRequest, NextResponse } from "next/server";

import { isAllowedOrigin } from "@/lib/cors";
import { preflight, withSession } from "@/lib/route";
import { clearSave, loadSave, saveState } from "@/lib/saves";

/** A furyo's state is a few KB; anything far bigger isn't one. */
const MAX_BODY_BYTES = 256 * 1024;

// The Furyodachi save API, called by the game (furyodachi.jeremyfarnault.com) with the shared
// session cookie (CORS: the game's origin only). GET loads the user's furyo ({ saved: { state, version } | null }), PUT
// { state, expectedVersion } saves it (409 on a stale version, nothing stored), DELETE clears it.

export const GET = withSession(isAllowedOrigin, async (_request, userId) => {
  const saved = await loadSave(db, userId);
  return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
});

export const PUT = withSession(isAllowedOrigin, async (request, userId) => {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  const body = parseSaveBody(text);
  if (!body)
    return NextResponse.json({ error: "Expected { state, expectedVersion }" }, { status: 400 });
  const result = await saveState(db, userId, body.state, body.expectedVersion);
  if (!result.ok) return NextResponse.json({ error: "conflict" }, { status: 409 });
  return NextResponse.json({ version: result.version });
});

export const DELETE = withSession(isAllowedOrigin, async (_request, userId) => {
  await clearSave(db, userId);
  return new NextResponse(null, { status: 204 });
});

export const OPTIONS = preflight(isAllowedOrigin, "GET, PUT, DELETE, OPTIONS");

function parseSaveBody(text: string): { state: object; expectedVersion: number } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;
  const { state, expectedVersion } = body as Record<string, unknown>;
  if (typeof state !== "object" || state === null || Array.isArray(state)) return null;
  if (
    typeof expectedVersion !== "number" ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0
  ) {
    return null;
  }
  return { state, expectedVersion };
}

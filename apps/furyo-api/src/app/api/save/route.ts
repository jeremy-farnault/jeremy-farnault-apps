import { auth } from "@jf/auth";
import { db } from "@jf/db";
import { type NextRequest, NextResponse } from "next/server";

import { corsHeaders, isAllowedOrigin, preflightHeaders } from "@/lib/cors";
import { clearSave, loadSave, saveState } from "@/lib/saves";

/** A furyo's state is a few KB; anything far bigger isn't one. */
const MAX_BODY_BYTES = 256 * 1024;

// The Furyodachi save API, called by the game (furyodachi.jeremyfarnault.com) with the shared
// session cookie. GET loads the user's furyo ({ saved: { state, version } | null }), PUT
// { state, expectedVersion } saves it (409 on a stale version, nothing stored), DELETE clears it.

type Handler = (request: NextRequest, userId: string) => Promise<Response>;

/** CORS for the game's origin only, then the session: the user id never comes from the body. */
function route(handler: Handler) {
  return async (request: NextRequest): Promise<Response> => {
    const origin = request.headers.get("origin");
    // A browser always sends Origin on a cross-origin call; one from elsewhere gets no CORS headers.
    const cors = isAllowedOrigin(origin) ? corsHeaders(origin) : {};
    if (origin && !isAllowedOrigin(origin)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    const response = await handler(request, session.user.id);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  };
}

export const GET = route(async (_request, userId) => {
  const saved = await loadSave(db, userId);
  return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
});

export const PUT = route(async (request, userId) => {
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

export const DELETE = route(async (_request, userId) => {
  await clearSave(db, userId);
  return new NextResponse(null, { status: 204 });
});

export async function OPTIONS(request: NextRequest): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: preflightHeaders(origin) });
}

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

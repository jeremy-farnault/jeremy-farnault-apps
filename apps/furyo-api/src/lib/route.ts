import { auth } from "@jf/auth";
import { type NextRequest, NextResponse } from "next/server";

import { type OriginPolicy, corsHeaders, preflightHeaders } from "./cors";

type Handler = (request: NextRequest, userId: string) => Promise<Response>;

/**
 * CORS for the origins `allowed` accepts, then the session: the user id comes from the
 * session cookie, never the body. A disallowed origin gets a 403 and no CORS headers; a
 * missing session gets a 401 that carries them, so the caller can read it as "not logged in".
 */
export function withSession(allowed: OriginPolicy, handler: Handler) {
  return async (request: NextRequest): Promise<Response> => {
    const origin = request.headers.get("origin");
    // A browser always sends Origin on a cross-origin call; a same-origin GET may not.
    if (origin && !allowed(origin)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    const cors = allowed(origin) ? corsHeaders(origin) : {};
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }
    const response = await handler(request, session.user.id);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  };
}

/** The answer to a CORS preflight. */
export function preflight(allowed: OriginPolicy, methods: string) {
  return async (request: NextRequest): Promise<Response> => {
    const origin = request.headers.get("origin");
    if (!allowed(origin)) return new NextResponse(null, { status: 403 });
    return new NextResponse(null, { status: 204, headers: preflightHeaders(origin, methods) });
  };
}

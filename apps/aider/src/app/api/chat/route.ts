import { auth } from "@jf/auth";
import { type NextRequest, NextResponse } from "next/server";

// The Pi can be slow to first byte on a cold model load. The broker now starts
// streaming (meta + heartbeats) immediately, so this is a safety net rather than
// the primary defense against a mid-stream cutoff.
export const maxDuration = 300;

// BFF proxy to the Pi broker behind the Cloudflare Tunnel. The session is
// validated here on Vercel before the Pi is ever contacted; the Pi is reached
// server-to-server with a shared bearer secret plus a trusted X-Aider-User-Id
// header derived from the session — never from the request body or the model.
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const piUrl = process.env.AIDER_PI_URL;
  const secret = process.env.AIDER_PI_SHARED_SECRET;
  if (!piUrl || !secret) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${piUrl}/health`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

interface ChatRequestMessage {
  role: string;
  content: string;
}

interface ChatRequestBody {
  model: string;
  messages: ChatRequestMessage[];
}

function isChatRequestBody(value: unknown): value is ChatRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const model = (value as { model?: unknown }).model;
  const messages = (value as { messages?: unknown }).messages;
  return (
    typeof model === "string" &&
    model.length > 0 &&
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as { role?: unknown }).role === "string" &&
        typeof (m as { content?: unknown }).content === "string"
    )
  );
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const piUrl = process.env.AIDER_PI_URL;
  const secret = process.env.AIDER_PI_SHARED_SECRET;
  if (!piUrl || !secret) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isChatRequestBody(body)) {
    return NextResponse.json(
      { error: "Body must be { messages: { role, content }[] }" },
      { status: 400 }
    );
  }

  let piResponse: Response;
  try {
    piResponse = await fetch(`${piUrl}/v1/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "X-Aider-User-Id": session.user.id,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }

  if (!piResponse.ok || !piResponse.body) {
    return NextResponse.json({ error: "Backend error" }, { status: piResponse.status || 502 });
  }

  return new NextResponse(piResponse.body, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

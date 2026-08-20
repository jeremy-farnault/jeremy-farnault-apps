import { auth } from "@jf/auth";
import { type NextRequest, NextResponse } from "next/server";

// Minimal BFF proxy to the Pi backend behind the Cloudflare Tunnel.
// The session is validated here on Vercel before the Pi is ever contacted;
// the Pi is reached server-to-server with a shared bearer secret. Ticket 6
// grows this route into the streaming /api/chat broker.
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

import { checkLink } from "@/lib/check-link";
import { auth } from "@jf/auth";
import { NextResponse } from "next/server";

// A store that answers slowly still fits: the reader gives up on a page after 15 s.
export const maxDuration = 30;

// Checks one link's price now. A route handler rather than a server action so the page's
// check queue can run a few at once (server actions run one at a time).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const link = await checkLink(session.user.id, id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(link);
}

import { type DiscoverySource, type DiscoveryTarget, discover } from "@/lib/discovery";
import type { DiscoveryReply } from "@/lib/discovery-client";
import { toPreviewEdition } from "@/lib/preview-edition";
import { saveLink } from "@/lib/save-link";
import { auth } from "@jf/auth";
import { db, scannerItems } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// A store page plus, on a certain match, the add's own read of the product page.
export const maxDuration = 45;

type Body = { target: DiscoveryTarget; source: DiscoverySource | null };

// Looks for one wishlist item in one store and region, and adds a certain match straight
// away. A route handler rather than a server action so the panel can run every target at
// once (server actions run one at a time).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const [item] = await db
    .select({ id: scannerItems.id })
    .from(scannerItems)
    .where(
      and(
        eq(scannerItems.id, id),
        eq(scannerItems.userId, userId),
        eq(scannerItems.status, "wishlist")
      )
    )
    .limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { target, source } = (await request.json()) as Body;
  const found = await discover(source, target);
  if (found.status !== "found") return NextResponse.json(found satisfies DiscoveryReply);

  let added: Extract<DiscoveryReply, { status: "found" }>["added"] = null;
  if (found.autoAdd) {
    const saved = await saveLink(userId, { url: found.autoAdd, editionId: null }, { itemId: id });
    added = saved.ok
      ? { ok: true, name: saved.name, edition: toPreviewEdition(saved.edition) }
      : { ok: false, message: saved.message };
  }
  const reply: DiscoveryReply = {
    status: "found",
    added,
    suggestions: found.suggestions.map((c) => ({
      ...c,
      editions: c.editions.map(toPreviewEdition),
    })),
  };
  return NextResponse.json(reply);
}

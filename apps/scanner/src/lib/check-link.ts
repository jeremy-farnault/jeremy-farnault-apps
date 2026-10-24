import "server-only";

import { db, scannerItems, scannerLinks, scannerPriceChecks } from "@jf/db";
import { and, eq, sql } from "drizzle-orm";

import { readPrice } from "./price-reader";
import { getLatestCheck } from "./queries";
import type { SummaryLink } from "./summary";

// A route handler calls this rather than a server action: Next.js runs server actions one
// at a time per page, and the check queue needs a few running side by side.

export type CheckedLink = Pick<SummaryLink, "id" | "lastStatus" | "lastCheckedAt" | "latest"> & {
  lastSuccessAt: Date;
};

/**
 * Checks one link's price now, with its saved region and edition. A success adds a price
 * check; a failure only marks the link, keeping its earlier checks as the last good price.
 * Returns the link's new state so the list can update that row alone. Bought items are
 * never checked.
 */
export async function checkLink(userId: string, linkId: string): Promise<CheckedLink | null> {
  const [link] = await db
    .select({
      id: scannerLinks.id,
      url: scannerLinks.url,
      region: scannerLinks.region,
      editionId: scannerLinks.editionId,
      status: scannerItems.status,
    })
    .from(scannerLinks)
    .innerJoin(scannerItems, eq(scannerItems.id, scannerLinks.itemId))
    .where(and(eq(scannerLinks.id, linkId), eq(scannerLinks.userId, userId)))
    .limit(1);
  if (!link || link.status !== "wishlist") return null;

  const result = await readPrice(link.url, { region: link.region, editionId: link.editionId });
  const edition = result.ok ? result.reading.edition : null;

  if (edition) {
    await db.insert(scannerPriceChecks).values({
      linkId: link.id,
      normalPrice: edition.normalPrice,
      salePrice: edition.salePrice,
      currency: edition.currency,
      inStock: edition.inStock,
      discountPercent: edition.discountPercent,
      saleEndsAt: edition.saleEndsAt,
    });
  }
  const [updated] = await db
    .update(scannerLinks)
    .set(
      edition
        ? { lastStatus: "ok", lastCheckedAt: sql`now()`, lastSuccessAt: sql`now()` }
        : { lastStatus: "failed", lastCheckedAt: sql`now()` }
    )
    .where(eq(scannerLinks.id, link.id))
    .returning({
      id: scannerLinks.id,
      lastStatus: scannerLinks.lastStatus,
      lastCheckedAt: scannerLinks.lastCheckedAt,
      lastSuccessAt: scannerLinks.lastSuccessAt,
    });
  if (!updated) return null;

  return { ...updated, latest: await getLatestCheck(link.id) };
}

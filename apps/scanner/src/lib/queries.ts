import { db, scannerItems, scannerLinks, scannerPriceChecks } from "@jf/db";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

export type LinkRow = {
  id: string;
  url: string;
  store: string;
  region: string | null;
  lastStatus: "ok" | "failed";
  lastCheckedAt: Date;
  lastSuccessAt: Date;
  /** The most recent successful check, or null if there has never been one. */
  latest: {
    normalPrice: number;
    salePrice: number | null;
    currency: string;
    inStock: boolean;
    discountPercent: number | null;
    saleEndsAt: Date | null;
    checkedAt: Date;
  } | null;
};

export type ItemRow = {
  id: string;
  name: string;
  createdAt: Date;
  links: LinkRow[];
};

/** The user's wishlist (not bought), newest first, each with its links and latest prices. */
export async function getWishlist(userId: string): Promise<ItemRow[]> {
  const items = await db
    .select({ id: scannerItems.id, name: scannerItems.name, createdAt: scannerItems.createdAt })
    .from(scannerItems)
    .where(and(eq(scannerItems.userId, userId), eq(scannerItems.status, "wishlist")))
    .orderBy(desc(scannerItems.createdAt));
  if (items.length === 0) return [];

  const links = await db
    .select({
      id: scannerLinks.id,
      itemId: scannerLinks.itemId,
      url: scannerLinks.url,
      store: scannerLinks.store,
      region: scannerLinks.region,
      lastStatus: scannerLinks.lastStatus,
      lastCheckedAt: scannerLinks.lastCheckedAt,
      lastSuccessAt: scannerLinks.lastSuccessAt,
    })
    .from(scannerLinks)
    .where(
      and(
        eq(scannerLinks.userId, userId),
        inArray(
          scannerLinks.itemId,
          items.map((i) => i.id)
        )
      )
    )
    .orderBy(asc(scannerLinks.createdAt));

  const latest = links.length
    ? await db
        .selectDistinctOn([scannerPriceChecks.linkId], {
          linkId: scannerPriceChecks.linkId,
          normalPrice: scannerPriceChecks.normalPrice,
          salePrice: scannerPriceChecks.salePrice,
          currency: scannerPriceChecks.currency,
          inStock: scannerPriceChecks.inStock,
          discountPercent: scannerPriceChecks.discountPercent,
          saleEndsAt: scannerPriceChecks.saleEndsAt,
          checkedAt: scannerPriceChecks.checkedAt,
        })
        .from(scannerPriceChecks)
        .where(
          inArray(
            scannerPriceChecks.linkId,
            links.map((l) => l.id)
          )
        )
        .orderBy(scannerPriceChecks.linkId, desc(scannerPriceChecks.checkedAt))
    : [];
  const latestByLink = new Map(latest.map(({ linkId, ...check }) => [linkId, check]));

  return items.map((item) => ({
    ...item,
    links: links
      .filter((l) => l.itemId === item.id)
      .map(({ itemId: _, ...link }) => ({ ...link, latest: latestByLink.get(link.id) ?? null })),
  }));
}

/** The links already tracking this page in this region, one per edition, with their item. */
export async function findTrackedLinks(
  userId: string,
  normalizedUrl: string,
  region: string | null
): Promise<{ editionId: string | null; itemId: string; itemName: string }[]> {
  return db
    .select({
      editionId: scannerLinks.editionId,
      itemId: scannerItems.id,
      itemName: scannerItems.name,
    })
    .from(scannerLinks)
    .innerJoin(scannerItems, eq(scannerItems.id, scannerLinks.itemId))
    .where(
      and(
        eq(scannerLinks.userId, userId),
        eq(scannerLinks.normalizedUrl, normalizedUrl),
        region === null ? isNull(scannerLinks.region) : eq(scannerLinks.region, region)
      )
    );
}

/** A link's most recent successful check, or null if it has never had one. */
export async function getLatestCheck(linkId: string): Promise<LinkRow["latest"]> {
  const [check] = await db
    .select({
      normalPrice: scannerPriceChecks.normalPrice,
      salePrice: scannerPriceChecks.salePrice,
      currency: scannerPriceChecks.currency,
      inStock: scannerPriceChecks.inStock,
      discountPercent: scannerPriceChecks.discountPercent,
      saleEndsAt: scannerPriceChecks.saleEndsAt,
      checkedAt: scannerPriceChecks.checkedAt,
    })
    .from(scannerPriceChecks)
    .where(eq(scannerPriceChecks.linkId, linkId))
    .orderBy(desc(scannerPriceChecks.checkedAt))
    .limit(1);
  return check ?? null;
}

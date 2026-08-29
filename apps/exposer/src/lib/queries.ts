import "server-only";

import { db, exposerItems, exposerPhotos, user } from "@jf/db";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getPublicImageUrl } from "./s3-url";

const PAGE_SIZE = 12;

export type FeedCursor = { date: string; createdAt: string; id: string };

export type FeedPhoto = { url: string; width: number; height: number };

export type FeedItem = {
  id: string;
  title: string | null;
  /** "YYYY-MM-DD" — used for day-header grouping. */
  date: string;
  isDraft: boolean;
  photos: FeedPhoto[];
};

export type FeedPage = { items: FeedItem[]; nextCursor: FeedCursor | null };

/** Resolve a handle to its owning user, or null if no one has claimed it. */
export async function getUserByHandle(handle: string): Promise<{ id: string } | null> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.handle, handle)).limit(1);
  return row ?? null;
}

/**
 * One page of an owner's feed, newest first, ordered by (date, createdAt, id) via keyset
 * pagination. `includeDrafts` must be derived from the session server-side — never trust
 * the client — so drafts are only ever returned to the owner.
 */
export async function getFeedPage(
  ownerId: string,
  includeDrafts: boolean,
  cursor: FeedCursor | null,
  limit = PAGE_SIZE
): Promise<FeedPage> {
  const cursorCondition = cursor
    ? or(
        lt(exposerItems.date, cursor.date),
        and(
          eq(exposerItems.date, cursor.date),
          lt(exposerItems.createdAt, new Date(cursor.createdAt))
        ),
        and(
          eq(exposerItems.date, cursor.date),
          eq(exposerItems.createdAt, new Date(cursor.createdAt)),
          lt(exposerItems.id, cursor.id)
        )
      )
    : undefined;

  const rows = await db
    .select({
      id: exposerItems.id,
      title: exposerItems.title,
      date: exposerItems.date,
      createdAt: exposerItems.createdAt,
      visibility: exposerItems.visibility,
    })
    .from(exposerItems)
    .where(
      and(
        eq(exposerItems.userId, ownerId),
        includeDrafts ? undefined : eq(exposerItems.visibility, "public"),
        cursorCondition
      )
    )
    .orderBy(desc(exposerItems.date), desc(exposerItems.createdAt), desc(exposerItems.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const last = pageRows[pageRows.length - 1];
  const nextCursor: FeedCursor | null =
    hasMore && last
      ? { date: last.date, createdAt: last.createdAt.toISOString(), id: last.id }
      : null;

  const photosByItem = await getPhotosByItem(pageRows.map((r) => r.id));

  const items: FeedItem[] = pageRows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    isDraft: r.visibility === "draft",
    photos: photosByItem.get(r.id) ?? [],
  }));

  return { items, nextCursor };
}

/** Fetch every photo for the given item ids in one query, grouped and ordered by position. */
async function getPhotosByItem(itemIds: string[]): Promise<Map<string, FeedPhoto[]>> {
  const byItem = new Map<string, FeedPhoto[]>();
  if (itemIds.length === 0) return byItem;

  const rows = await db
    .select({
      itemId: exposerPhotos.itemId,
      storageKey: exposerPhotos.storageKey,
      width: exposerPhotos.width,
      height: exposerPhotos.height,
    })
    .from(exposerPhotos)
    .where(inArray(exposerPhotos.itemId, itemIds))
    .orderBy(exposerPhotos.position);

  for (const row of rows) {
    const photo: FeedPhoto = {
      url: getPublicImageUrl(row.storageKey),
      width: row.width,
      height: row.height,
    };
    const existing = byItem.get(row.itemId);
    if (existing) existing.push(photo);
    else byItem.set(row.itemId, [photo]);
  }

  return byItem;
}

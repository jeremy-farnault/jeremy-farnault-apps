import "server-only";

import { db, exposerItemTags, exposerItems, exposerPhotos, exposerTags, user } from "@jf/db";
import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql } from "drizzle-orm";
import { renderDescriptionHtml } from "./description";
import { getPublicImageUrl } from "./s3-url";

const PAGE_SIZE = 12;

export type FeedCursor = { date: string; createdAt: string; id: string };

export type FeedFilters = { tags: string[]; from: string | null; to: string | null };

export const NO_FILTERS: FeedFilters = { tags: [], from: null, to: null };

export type FeedPhoto = { url: string; width: number; height: number };

export type FeedTag = { name: string; color: string | null };

export type FeedItem = {
  id: string;
  title: string | null;
  /** Server-sanitized HTML of the description, or null when empty. */
  descriptionHtml: string | null;
  /** "YYYY-MM-DD" — used for day-header grouping. */
  date: string;
  isDraft: boolean;
  photos: FeedPhoto[];
  tags: FeedTag[];
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
  filters: FeedFilters = NO_FILTERS,
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

  // Tag AND: resolve the selected names to this owner's tag ids. If any name doesn't
  // resolve, the AND is unsatisfiable → return an empty page.
  let tagCondition: ReturnType<typeof inArray> | undefined;
  if (filters.tags.length > 0) {
    const tagIds = (
      await db
        .select({ id: exposerTags.id })
        .from(exposerTags)
        .where(and(eq(exposerTags.userId, ownerId), inArray(exposerTags.name, filters.tags)))
    ).map((t) => t.id);

    if (tagIds.length < new Set(filters.tags).size) {
      return { items: [], nextCursor: null };
    }

    const matchingItemIds = db
      .select({ id: exposerItemTags.itemId })
      .from(exposerItemTags)
      .where(inArray(exposerItemTags.tagId, tagIds))
      .groupBy(exposerItemTags.itemId)
      .having(sql`count(distinct ${exposerItemTags.tagId}) = ${tagIds.length}`);

    tagCondition = inArray(exposerItems.id, matchingItemIds);
  }

  const rows = await db
    .select({
      id: exposerItems.id,
      title: exposerItems.title,
      description: exposerItems.description,
      date: exposerItems.date,
      createdAt: exposerItems.createdAt,
      visibility: exposerItems.visibility,
    })
    .from(exposerItems)
    .where(
      and(
        eq(exposerItems.userId, ownerId),
        includeDrafts ? undefined : eq(exposerItems.visibility, "public"),
        filters.from ? gte(exposerItems.date, filters.from) : undefined,
        filters.to ? lte(exposerItems.date, filters.to) : undefined,
        tagCondition,
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

  const itemIds = pageRows.map((r) => r.id);
  const [photosByItem, tagsByItem] = await Promise.all([
    getPhotosByItem(itemIds),
    getTagsByItem(itemIds),
  ]);

  const items: FeedItem[] = pageRows.map((r) => ({
    id: r.id,
    title: r.title,
    descriptionHtml: renderDescriptionHtml(r.description),
    date: r.date,
    isDraft: r.visibility === "draft",
    photos: photosByItem.get(r.id) ?? [],
    tags: tagsByItem.get(r.id) ?? [],
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

/** Fetch all tags for the given item ids in one query, grouped and ordered by name. */
async function getTagsByItem(itemIds: string[]): Promise<Map<string, FeedTag[]>> {
  const byItem = new Map<string, FeedTag[]>();
  if (itemIds.length === 0) return byItem;

  const rows = await db
    .select({
      itemId: exposerItemTags.itemId,
      name: exposerTags.name,
      color: exposerTags.color,
    })
    .from(exposerItemTags)
    .innerJoin(exposerTags, eq(exposerItemTags.tagId, exposerTags.id))
    .where(inArray(exposerItemTags.itemId, itemIds))
    .orderBy(asc(exposerTags.name));

  for (const row of rows) {
    const tag: FeedTag = { name: row.name, color: row.color };
    const existing = byItem.get(row.itemId);
    if (existing) existing.push(tag);
    else byItem.set(row.itemId, [tag]);
  }

  return byItem;
}

/**
 * Distinct tags that appear on the owner's *visible* items — the set offered by the feed
 * filter. Scoping to visible items keeps the list filterable and avoids leaking tag names
 * that only appear on drafts to visitors.
 */
export async function getFilterableTags(
  ownerId: string,
  includeDrafts: boolean
): Promise<FeedTag[]> {
  return db
    .selectDistinct({ name: exposerTags.name, color: exposerTags.color })
    .from(exposerTags)
    .innerJoin(exposerItemTags, eq(exposerItemTags.tagId, exposerTags.id))
    .innerJoin(exposerItems, eq(exposerItems.id, exposerItemTags.itemId))
    .where(
      and(
        eq(exposerTags.userId, ownerId),
        includeDrafts ? undefined : eq(exposerItems.visibility, "public")
      )
    )
    .orderBy(asc(exposerTags.name));
}

import { db, journalerEntries } from "@jf/db";
import { and, asc, desc, eq, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";

export type JournalerEntry = typeof journalerEntries.$inferSelect;

export type SortOption = "date-desc" | "date-asc" | "title-asc" | "category" | "rating-desc";
export type EntryCategory = "Movie" | "TV Show" | "Book" | "Game" | "Manga";

export type EntryCursor =
  | { type: "date"; date: string; id: string }
  | { type: "offset"; offset: number };

export type FilterParams = {
  sort: SortOption;
  categories: EntryCategory[];
  rating: number | null;
};

export const DEFAULT_FILTERS: FilterParams = {
  sort: "date-desc",
  categories: [],
  rating: null,
};

function buildFilterConditions(userId: string, filters: FilterParams) {
  const conditions = [eq(journalerEntries.userId, userId)];

  if (filters.categories.length > 0) {
    conditions.push(inArray(journalerEntries.category, filters.categories));
  }

  if (filters.rating !== null) {
    conditions.push(eq(journalerEntries.rating, filters.rating));
  }

  return conditions;
}

export async function getEntries(
  userId: string,
  cursor: EntryCursor | null,
  filters: FilterParams = DEFAULT_FILTERS,
  limit = 30,
): Promise<{ entries: JournalerEntry[]; nextCursor: EntryCursor | null }> {
  const baseConditions = buildFilterConditions(userId, filters);

  // ── Date sorts: cursor-based pagination ──────────────────────────────────
  if (filters.sort === "date-desc" || filters.sort === "date-asc") {
    const isDesc = filters.sort === "date-desc";

    let cursorCondition: ReturnType<typeof or> | undefined;
    if (cursor?.type === "date") {
      cursorCondition = isDesc
        ? or(
            lt(journalerEntries.date, cursor.date),
            and(eq(journalerEntries.date, cursor.date), lt(journalerEntries.id, cursor.id)),
          )
        : or(
            gt(journalerEntries.date, cursor.date),
            and(eq(journalerEntries.date, cursor.date), gt(journalerEntries.id, cursor.id)),
          );
    }

    const rows = await db
      .select()
      .from(journalerEntries)
      .where(and(...baseConditions, cursorCondition))
      .orderBy(
        isDesc ? desc(journalerEntries.date) : asc(journalerEntries.date),
        isDesc ? desc(journalerEntries.id) : asc(journalerEntries.id),
      )
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;
    const last = entries[entries.length - 1];
    const nextCursor: EntryCursor | null =
      hasMore && last ? { type: "date", date: last.date, id: last.id } : null;

    return { entries, nextCursor };
  }

  // ── Non-date sorts: offset-based pagination ──────────────────────────────
  const offset = cursor?.type === "offset" ? cursor.offset : 0;

  const orderBy =
    filters.sort === "title-asc"
      ? [asc(journalerEntries.title), asc(journalerEntries.id)]
      : filters.sort === "category"
        ? [asc(journalerEntries.category), desc(journalerEntries.date), asc(journalerEntries.id)]
        : // rating-desc: nulls last
          [
            sql`${journalerEntries.rating} DESC NULLS LAST`,
            desc(journalerEntries.date),
            asc(journalerEntries.id),
          ];

  const rows = await db
    .select()
    .from(journalerEntries)
    .where(and(...baseConditions))
    .orderBy(...orderBy)
    .offset(offset)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor: EntryCursor | null = hasMore ? { type: "offset", offset: offset + limit } : null;

  return { entries, nextCursor };
}

export async function searchEntries(
  userId: string,
  query: string,
  filters: FilterParams = DEFAULT_FILTERS,
  limit = 50,
): Promise<JournalerEntry[]> {
  const baseConditions = buildFilterConditions(userId, filters);

  return db
    .select()
    .from(journalerEntries)
    .where(and(...baseConditions, ilike(journalerEntries.title, `%${query}%`)))
    .orderBy(desc(journalerEntries.date), asc(journalerEntries.id))
    .limit(limit);
}

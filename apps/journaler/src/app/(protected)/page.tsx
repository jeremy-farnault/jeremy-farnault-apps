import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { Suspense } from "react";
import { CalendarBreadcrumb } from "@/components/calendar-breadcrumb";
import { EntriesGrid } from "@/components/entries-grid";
import {
  getEntries,
  type CalendarScope,
  type EntryCategory,
  type FilterParams,
  type SortOption,
} from "@/lib/queries";
import { getPublicImageUrl } from "@/lib/s3-url";
import type { CardEntry } from "@/components/entry-card";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const VALID_SORTS: SortOption[] = ["date-desc", "date-asc", "title-asc", "category", "rating-desc"];
const VALID_CATEGORIES: EntryCategory[] = ["Movie", "TV Show", "Book", "Game", "Manga"];

function parseFilters(raw: Record<string, string | string[] | undefined>): FilterParams {
  const rawSort = typeof raw.sort === "string" ? raw.sort : "date-desc";
  const sort: SortOption = VALID_SORTS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "date-desc";

  const rawCategories = Array.isArray(raw.category)
    ? raw.category
    : raw.category
      ? [raw.category]
      : [];
  const categories = rawCategories.filter((c): c is EntryCategory =>
    VALID_CATEGORIES.includes(c as EntryCategory),
  );

  const rawRating = typeof raw.rating === "string" ? Number(raw.rating) : NaN;
  const rating =
    Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 10 ? rawRating : null;

  const rawYear = typeof raw.year === "string" ? Number(raw.year) : NaN;
  const year = Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 2100 ? rawYear : null;

  let calendarScope: CalendarScope | null = null;
  if (year !== null) {
    calendarScope = { year };

    const rawMonth = typeof raw.month === "string" ? Number(raw.month) : NaN;
    const month =
      Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : null;

    if (month !== null) {
      calendarScope = { year, month };

      const rawDay = typeof raw.day === "string" ? Number(raw.day) : NaN;
      const day =
        Number.isInteger(rawDay) && rawDay >= 1 && rawDay <= 31 ? rawDay : null;

      if (day !== null) {
        calendarScope = { year, month, day };
      }
    }
  }

  return { sort, categories, rating, calendarScope };
}

export default async function JournalerPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const raw = await searchParams;
  const filters = parseFilters(raw);

  const { entries, nextCursor } = await getEntries(userId, null, filters);

  const cardEntries: CardEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    date: e.date,
    comment: e.comment,
    rating: e.rating,
    imageKey: e.imageKey,
    imageUrl: e.imageKey ? getPublicImageUrl(e.imageKey) : null,
  }));

  const filtersKey = [
    filters.sort,
    [...filters.categories].sort().join(","),
    filters.rating ?? "null",
    filters.calendarScope
      ? [
          filters.calendarScope.year,
          filters.calendarScope.month ?? "x",
          filters.calendarScope.day ?? "x",
        ].join("-")
      : "null",
  ].join("|");

  return (
    <main className="p-6">
      {filters.calendarScope && <CalendarBreadcrumb scope={filters.calendarScope} />}
      <Suspense fallback={<div className="h-[52px] mb-6" />}>
        <EntriesGrid
          key={filtersKey}
          initialEntries={cardEntries}
          initialNextCursor={nextCursor}
          filters={filters}
        />
      </Suspense>
    </main>
  );
}

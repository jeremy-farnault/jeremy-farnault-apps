import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { FilterBar } from "@/components/filter-bar";
import { EntriesGrid } from "@/components/entries-grid";
import {
  getEntries,
  type EntryCategory,
  type FilterParams,
  type SortOption,
} from "@/lib/queries";
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

  return { sort, categories, rating };
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
    imageUrl: null,
  }));

  const filtersKey = [
    filters.sort,
    [...filters.categories].sort().join(","),
    filters.rating ?? "null",
  ].join("|");

  return (
    <main className="p-6">
      <FilterBar filters={filters} />
      <EntriesGrid
        key={filtersKey}
        initialEntries={cardEntries}
        initialNextCursor={nextCursor}
        filters={filters}
      />
    </main>
  );
}

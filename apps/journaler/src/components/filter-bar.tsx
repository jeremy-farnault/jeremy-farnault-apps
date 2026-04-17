"use client";

import { cn, Select, SelectItem } from "@jf/ui";
import { XIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EntryCategory, FilterParams, SortOption } from "@/lib/queries";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Date (newest first)" },
  { value: "date-asc", label: "Date (oldest first)" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "category", label: "Category" },
  { value: "rating-desc", label: "Rating (highest first)" },
];

const CATEGORY_OPTIONS: EntryCategory[] = ["Movie", "TV Show", "Book", "Game", "Manga"];

const RATING_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Props = { filters: FilterParams };

export function FilterBar({ filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(changes: Partial<{ sort: SortOption; categories: EntryCategory[]; rating: number | null }>) {
    const params = new URLSearchParams(searchParams.toString());

    if (changes.sort !== undefined) {
      if (changes.sort === "date-desc") params.delete("sort");
      else params.set("sort", changes.sort);
    }

    if (changes.categories !== undefined) {
      params.delete("category");
      for (const c of changes.categories) params.append("category", c);
    }

    if (changes.rating !== undefined) {
      if (changes.rating === null) params.delete("rating");
      else params.set("rating", String(changes.rating));
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleCategory(cat: EntryCategory) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    update({ categories: next });
  }

  const isDefault =
    filters.sort === "date-desc" &&
    filters.categories.length === 0 &&
    filters.rating === null;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <Select
        value={filters.sort}
        onValueChange={(v) => update({ sort: v as SortOption })}
        className="w-[220px]"
      >
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </Select>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggleCategory(cat)}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium transition-colors",
              filters.categories.includes(cat)
                ? "bg-(--grey-800) text-white"
                : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <Select
        value={filters.rating !== null ? String(filters.rating) : ""}
        onValueChange={(v) => update({ rating: v ? Number(v) : null })}
        placeholder="Rating"
        className="w-[140px]"
      >
        {RATING_OPTIONS.map((r) => (
          <SelectItem key={r} value={String(r)}>
            {r}
          </SelectItem>
        ))}
      </Select>

      {!isDefault && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-sm text-(--grey-700) bg-(--surface-150) hover:bg-(--surface-200)"
        >
          <XIcon size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}

"use client";

import type { SortOption } from "@/lib/queries";
import { SearchInput, Select, SelectItem } from "@jf/ui";
import { ArchiveIcon, ChartLineIcon, GridFourIcon } from "@phosphor-icons/react";
import Link from "next/link";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "createdAt", label: "Date Created" },
  { value: "name", label: "Name A–Z" },
  { value: "lastLogged", label: "Last Logged" },
];

type Props = {
  sort: SortOption;
  onSearch: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
};

export function HabitsFilterBar({ sort, onSearch, onSortChange }: Props) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <SearchInput
        placeholder="Search habits…"
        onDebouncedChange={onSearch}
        className="min-w-[250px] max-w-[300px]"
      />
      <div className="flex items-center gap-2">
        <Select
          value={sort}
          onValueChange={(v) => onSortChange(v as SortOption)}
          className="w-[180px]"
        >
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>
        <Link
          href="/archive"
          title="Archive"
          className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200) hover:text-(--grey-900)"
        >
          <ArchiveIcon size={20} />
        </Link>
        <button
          type="button"
          disabled
          aria-label="Grid view"
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-(--grey-600) opacity-50 cursor-not-allowed"
        >
          <GridFourIcon size={18} />
        </button>
        <button
          type="button"
          disabled
          aria-label="Chart view"
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-(--grey-600) opacity-50 cursor-not-allowed"
        >
          <ChartLineIcon size={18} />
        </button>
      </div>
    </div>
  );
}

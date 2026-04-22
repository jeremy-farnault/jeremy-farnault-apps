"use client";

import type { SortOption } from "@/lib/queries";
import { SearchInput, Select, SelectItem } from "@jf/ui";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "createdAt", label: "Date Archived" },
  { value: "name", label: "Name A–Z" },
  { value: "lastLogged", label: "Last Logged" },
];

type Props = {
  sort: SortOption;
  onSearch: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
};

export function ArchivedHabitsFilterBar({ sort, onSearch, onSortChange }: Props) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput
          placeholder="Search archived habits…"
          onDebouncedChange={onSearch}
          className="min-w-[250px] max-w-[300px]"
        />
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
      </div>
    </div>
  );
}

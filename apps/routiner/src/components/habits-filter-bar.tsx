"use client";

import type { SortOption } from "@/lib/queries";
import { DatePicker, SearchInput, Select, SelectItem } from "@jf/ui";
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
  viewMode: "heatmap" | "chart";
  onViewModeChange: (mode: "heatmap" | "chart") => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
};

export function HabitsFilterBar({
  sort,
  onSearch,
  onSortChange,
  viewMode,
  onViewModeChange,
  dateRange,
  onDateRangeChange,
}: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput
          placeholder="Search habits…"
          onDebouncedChange={onSearch}
          className="min-w-[250px] max-w-[300px]"
        />
        <div className="flex items-center justify-between gap-2">
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
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "heatmap"}
              onClick={() => onViewModeChange("heatmap")}
              className={`flex h-11 w-11 items-center justify-center rounded-[10px] ${
                viewMode === "heatmap"
                  ? "bg-(--surface-200) text-(--grey-900)"
                  : "text-(--grey-600) hover:bg-(--surface-150) hover:text-(--grey-900)"
              }`}
            >
              <GridFourIcon size={18} />
            </button>
            <button
              type="button"
              aria-label="Chart view"
              aria-pressed={viewMode === "chart"}
              onClick={() => onViewModeChange("chart")}
              className={`flex h-11 w-11 items-center justify-center rounded-[10px] ${
                viewMode === "chart"
                  ? "bg-(--surface-200) text-(--grey-900)"
                  : "text-(--grey-600) hover:bg-(--surface-150) hover:text-(--grey-900)"
              }`}
            >
              <ChartLineIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "chart" && (
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-(--grey-500)">From</span>
            <div className="w-full max-w-[284px]">
              <DatePicker
                value={dateRange.from}
                onChange={(from) => onDateRangeChange({ ...dateRange, from })}
                placeholder="Start date"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-(--grey-500)">To</span>
            <div className="w-full max-w-[284px]">
              <DatePicker
                value={dateRange.to}
                onChange={(to) => onDateRangeChange({ ...dateRange, to })}
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

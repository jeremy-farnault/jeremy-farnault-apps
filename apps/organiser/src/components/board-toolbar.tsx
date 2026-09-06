"use client";

import type { TagRow } from "@/lib/queries";
import { Button, COLOR_PALETTE, SearchInput, Select, SelectItem, cn } from "@jf/ui";
import { CheckIcon, PaletteIcon, TagIcon, XIcon } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export type DeadlineBucket = "overdue" | "due-soon" | "has-date" | "none";

const DEADLINE_LABELS: Record<DeadlineBucket, string> = {
  overdue: "Overdue",
  "due-soon": "Due soon",
  "has-date": "Has a date",
  none: "No date",
};

const popoverContentClass = cn(
  "z-50 flex flex-col gap-2 rounded-[14px] bg-(--card) p-3",
  "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none"
);

export function BoardToolbar({
  searchKey,
  onSearchChange,
  allTags,
  filterTagIds,
  onToggleTag,
  deadlineBucket,
  onDeadlineChange,
  filterColor,
  onColorChange,
  hasActiveFilters,
  onClear,
  onManageTags,
}: {
  searchKey: number;
  onSearchChange: (value: string) => void;
  allTags: TagRow[];
  filterTagIds: string[];
  onToggleTag: (tagId: string) => void;
  deadlineBucket: DeadlineBucket | null;
  onDeadlineChange: (bucket: DeadlineBucket | null) => void;
  filterColor: string | null;
  onColorChange: (color: string | null) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
  onManageTags: () => void;
}) {
  const selectedColor = COLOR_PALETTE.find((c) => c.value === filterColor);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
      <SearchInput
        key={searchKey}
        className="w-full sm:w-64"
        placeholder="Search cards…"
        onDebouncedChange={onSearchChange}
      />

      {/* Tag filter */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <FilterButton active={filterTagIds.length > 0}>
            <TagIcon size={16} />
            Tags
            {filterTagIds.length > 0 && <Count>{filterTagIds.length}</Count>}
          </FilterButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={cn(popoverContentClass, "max-w-[280px]")}
          >
            {allTags.length === 0 ? (
              <span className="px-1 text-xs text-(--grey-500)">No tags yet.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const on = filterTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        on
                          ? "border-(--blue-600) text-(--grey-900)"
                          : "border-(--grey-300) text-(--grey-600) hover:border-(--grey-400)"
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                        aria-hidden
                      />
                      {tag.name}
                      {on && <CheckIcon size={11} weight="bold" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Deadline filter */}
      <Select
        value={deadlineBucket ?? "any"}
        onValueChange={(v) => onDeadlineChange(v === "any" ? null : (v as DeadlineBucket))}
        placeholder="Deadline"
        className="w-40"
      >
        <SelectItem value="any">Any deadline</SelectItem>
        {(Object.keys(DEADLINE_LABELS) as DeadlineBucket[]).map((bucket) => (
          <SelectItem key={bucket} value={bucket}>
            {DEADLINE_LABELS[bucket]}
          </SelectItem>
        ))}
      </Select>

      {/* Colour filter */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <FilterButton active={filterColor !== null}>
            {filterColor ? (
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: filterColor }}
                aria-hidden
              />
            ) : (
              <PaletteIcon size={16} />
            )}
            {selectedColor?.label ?? "Colour"}
          </FilterButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className={cn(popoverContentClass, "w-[220px]")}
          >
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => onColorChange(c.value)}
                  className="h-6 w-6 shrink-0 rounded-full"
                  style={{
                    backgroundColor: c.value,
                    outline: filterColor === c.value ? "2px solid var(--grey-900)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            {filterColor && (
              <button
                type="button"
                onClick={() => onColorChange(null)}
                className="self-start text-xs text-(--grey-500) hover:text-(--grey-900)"
              >
                Any colour
              </button>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-(--grey-500) hover:text-(--grey-900)"
        >
          <XIcon size={12} weight="bold" /> Clear
        </button>
      )}

      <div className="ml-auto">
        <Button variant="outline" onClick={onManageTags}>
          <TagIcon size={16} /> Manage tags
        </Button>
      </div>
    </div>
  );
}

// Forwards ref/props so it can serve as a `Popover.Trigger asChild` child.
const FilterButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
>(function FilterButton({ active, children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-sm",
        active
          ? "border-(--blue-600) text-(--grey-900)"
          : "border-(--grey-300) text-(--grey-700) hover:border-(--grey-400)",
        className
      )}
    >
      {children}
    </button>
  );
});

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-(--blue-600) px-1 text-[10px] font-semibold text-white">
      {children}
    </span>
  );
}

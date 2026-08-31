"use client";

import type { FeedFilters, FeedTag } from "@/lib/queries";
import { DatePicker } from "@jf/ui";
import { FunnelIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  tags: FeedTag[];
  value: FeedFilters;
  onChange: (next: FeedFilters) => void;
};

export function FeedFilterBar({ tags, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = value.tags.length + (value.from ? 1 : 0) + (value.to ? 1 : 0);
  const hasFilterableContent = tags.length > 0;

  function toggleTag(name: string) {
    onChange({
      ...value,
      tags: value.tags.includes(name)
        ? value.tags.filter((t) => t !== name)
        : [...value.tags, name],
    });
  }

  function clearAll() {
    onChange({ tags: [], from: null, to: null });
  }

  // Nothing to filter by and no active filters → don't show the control at all.
  if (!hasFilterableContent && activeCount === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-(--grey-300) px-3 py-1 text-sm text-(--grey-700) hover:border-(--grey-400) hover:text-(--grey-900)"
        >
          <FunnelIcon size={15} weight={activeCount > 0 ? "fill" : "regular"} />
          Filter
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-(--primary) px-1.5 text-xs text-(--grey-900)">
              {activeCount}
            </span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-(--grey-500) hover:text-(--grey-900)"
          >
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-4 rounded-xl bg-(--surface-150) p-4">
          {tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-(--grey-500)">
                Tags (match all selected)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = value.tags.includes(tag.name);
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                        selected
                          ? "bg-(--primary) text-(--grey-900)"
                          : "bg-(--surface-200) text-(--grey-700) hover:bg-(--surface-300)"
                      }`}
                    >
                      {tag.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                          aria-hidden
                        />
                      )}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-(--grey-500)">Date range</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <DatePicker
                  value={value.from ?? ""}
                  onChange={(from) => onChange({ ...value, from: from || null })}
                  placeholder="From"
                  {...(value.to ? { maxDate: value.to } : {})}
                />
              </div>
              <span className="text-sm text-(--grey-500)">–</span>
              <div className="min-w-0 flex-1">
                <DatePicker
                  value={value.to ?? ""}
                  onChange={(to) => onChange({ ...value, to: to || null })}
                  placeholder="To"
                  {...(value.from ? { minDate: value.from } : {})}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

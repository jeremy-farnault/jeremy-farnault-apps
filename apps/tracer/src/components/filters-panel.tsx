"use client";

import { LINES } from "@/config/lines";
import { type FilterableCategory, useFilterStore } from "@/stores/filter-store";
import { useState } from "react";

const CATEGORY_LABELS: { id: FilterableCategory; emoji: string; label: string }[] = [
  { id: "station", emoji: "🚉", label: "Stations" },
  { id: "konbini", emoji: "🏪", label: "Konbini" },
  { id: "ramen", emoji: "🍜", label: "Ramen" },
  { id: "work", emoji: "💼", label: "Work" },
  { id: "izakaya", emoji: "🍺", label: "Izakaya" },
  { id: "sento", emoji: "♨️", label: "Sento" },
  { id: "shrine", emoji: "⛩️", label: "Shrine" },
  { id: "school", emoji: "🏫", label: "School" },
];

export function FiltersPanel() {
  const [expanded, setExpanded] = useState(false);
  const enabledCategories = useFilterStore((s) => s.enabledCategories);
  const enabledLines = useFilterStore((s) => s.enabledLines);
  const toggleCategory = useFilterStore((s) => s.toggleCategory);
  const toggleLine = useFilterStore((s) => s.toggleLine);
  const reset = useFilterStore((s) => s.reset);

  const stationOn = enabledCategories.includes("station");

  return (
    <div className="rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-red-500 select-none text-left w-full">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
          🎛️ Filters
        </p>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            {CATEGORY_LABELS.map((c) => {
              const on = enabledCategories.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    on ? "text-(--grey-200)" : "text-(--grey-500)/50"
                  }`}
                >
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span className="tabular-nums">{on ? "on" : "off"}</span>
                </button>
              );
            })}
          </div>

          {stationOn && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-(--surface-300)">
              <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
                Lines
              </p>
              {LINES.map((line) => {
                const on = enabledLines.includes(line.id);
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => toggleLine(line.id)}
                    className={`flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      on ? "text-(--grey-200)" : "text-(--grey-500)/50"
                    }`}
                  >
                    <span>{line.label}</span>
                    <span className="tabular-nums">{on ? "on" : "off"}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={reset}
            className="self-end text-xs text-(--grey-500) hover:text-white transition-colors cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}

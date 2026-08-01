"use client";

import { LineBadge } from "@/components/line-badge";
import { POIS } from "@/config/game";
import { LINES, type LineId, OPERATORS } from "@/config/lines";
import { searchPois } from "@/lib/search";
import { type FilterableCategory, useFilterStore } from "@/stores/filter-store";
import { useRegionStore } from "@/stores/region-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useMemo, useState } from "react";

const CATEGORY_LABELS: { id: FilterableCategory; emoji: string; label: string }[] = [
  { id: "station", emoji: "🚉", label: "Stations" },
  { id: "konbini", emoji: "🏪", label: "Konbini" },
  { id: "ramen", emoji: "🍜", label: "Ramen" },
  { id: "work", emoji: "💼", label: "Work" },
  { id: "izakaya", emoji: "🍺", label: "Izakaya" },
  { id: "sento", emoji: "♨️", label: "Sento" },
  { id: "shrine", emoji: "⛩️", label: "Shrine" },
  { id: "school", emoji: "🏫", label: "School" },
  { id: "gym", emoji: "💪", label: "Gym" },
  { id: "dojo", emoji: "🥋", label: "Dojo" },
  { id: "blackmarket", emoji: "🗡️", label: "Black Market" },
  { id: "garage", emoji: "🛵", label: "Garage" },
];

export function FiltersPanel() {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const enabledCategories = useFilterStore((s) => s.enabledCategories);
  const enabledLines = useFilterStore((s) => s.enabledLines);
  const toggleCategory = useFilterStore((s) => s.toggleCategory);
  const toggleLine = useFilterStore((s) => s.toggleLine);
  const reset = useFilterStore((s) => s.reset);
  const discoveredRegionIds = useRegionStore((s) => s.discoveredRegionIds);
  const requestSelection = useSelectionStore((s) => s.requestSelection);

  const stationOn = enabledCategories.includes("station");

  // Corpus: filters bypassed, region-discovery respected. Stations + goal
  // always eligible.
  const corpus = useMemo(
    () =>
      POIS.filter(
        (p) =>
          p.category === "station" ||
          p.category === "goal" ||
          discoveredRegionIds.includes(p.regionId)
      ),
    [discoveredRegionIds]
  );

  const results = useMemo(() => searchPois(corpus, query), [corpus, query]);

  const inGameLineIds = useMemo(() => {
    const set = new Set<LineId>();
    for (const p of POIS) {
      if (p.category === "station") for (const l of p.lines) set.add(l);
    }
    return set;
  }, []);

  function handleResultClick(id: string) {
    requestSelection(id);
    setQuery("");
    setExpanded(false);
  }

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
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search POI…"
              className="w-full rounded-lg bg-(--surface-300)/60 text-(--grey-200) placeholder:text-(--grey-500)/60 text-xs px-2.5 py-1.5 outline-none border border-transparent focus:border-(--grey-500)/40 transition-colors"
            />
            {query.trim() !== "" && (
              <div className="flex flex-col gap-0.5">
                {results.length === 0 ? (
                  <p className="text-xs text-(--grey-500)/60 italic px-1">No results</p>
                ) : (
                  results.map((poi) => (
                    <button
                      key={poi.id}
                      type="button"
                      onClick={() => handleResultClick(poi.id)}
                      className="flex items-center justify-between gap-2 text-xs text-(--grey-200) hover:text-white hover:bg-white/5 rounded px-1 py-0.5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">
                        {poi.emoji} {poi.label}
                      </span>
                      <span className="text-(--grey-500)/60 capitalize shrink-0">
                        {poi.category}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-(--surface-300)">
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
            <div className="flex flex-col gap-2 pt-2 border-t border-(--surface-300)">
              <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
                Lines
              </p>
              {OPERATORS.map((op) => {
                const opLines = LINES.filter(
                  (l) => l.operator === op.id && inGameLineIds.has(l.id)
                );
                if (opLines.length === 0) return null;
                return (
                  <div key={op.id} className="flex flex-col gap-1">
                    <p className="text-xs text-(--grey-500)">{op.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opLines.map((line) => (
                        <LineBadge
                          key={line.id}
                          code={line.code}
                          color={line.color}
                          enabled={enabledLines.includes(line.id)}
                          title={line.label}
                          onClick={() => toggleLine(line.id)}
                        />
                      ))}
                    </div>
                  </div>
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

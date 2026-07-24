"use client";

import type { PoiCategory } from "@/config/game";
import { LINES, type LineId } from "@/config/lines";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FilterableCategory = Exclude<PoiCategory, "home" | "goal">;

const DEFAULT_CATEGORIES: FilterableCategory[] = [
  "konbini",
  "school",
  "sento",
  "shrine",
  "izakaya",
  "ramen",
  "work",
  "station",
  "gym",
  "dojo",
];

const DEFAULT_LINES: LineId[] = LINES.map((l) => l.id);

type FilterState = {
  enabledCategories: FilterableCategory[];
  enabledLines: LineId[];
  toggleCategory: (cat: FilterableCategory) => void;
  toggleLine: (line: LineId) => void;
  reset: () => void;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      enabledCategories: DEFAULT_CATEGORIES,
      enabledLines: DEFAULT_LINES,

      toggleCategory: (cat) => set({ enabledCategories: toggle(get().enabledCategories, cat) }),
      toggleLine: (line) => set({ enabledLines: toggle(get().enabledLines, line) }),
      reset: () => set({ enabledCategories: DEFAULT_CATEGORIES, enabledLines: DEFAULT_LINES }),
    }),
    {
      name: "tracer:filter-store",
      partialize: (state) => ({
        enabledCategories: state.enabledCategories,
        enabledLines: state.enabledLines,
      }),
    }
  )
);

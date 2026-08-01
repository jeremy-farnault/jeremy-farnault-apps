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
  "blackmarket",
  "garage",
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
      version: 1,
      // v0 was persisted before some categories (e.g. blackmarket/garage) existed.
      // Union in any default categories added since, so new shops aren't hidden by
      // a stale persisted enabledCategories array.
      migrate: (persisted, version) => {
        const prev = (persisted ?? {}) as Partial<
          Pick<FilterState, "enabledCategories" | "enabledLines">
        >;
        const existing = prev.enabledCategories ?? DEFAULT_CATEGORIES;
        const enabledCategories =
          version < 1
            ? [...existing, ...DEFAULT_CATEGORIES.filter((c) => !existing.includes(c))]
            : existing;
        return {
          enabledCategories,
          enabledLines: prev.enabledLines ?? DEFAULT_LINES,
        } as FilterState;
      },
      partialize: (state) => ({
        enabledCategories: state.enabledCategories,
        enabledLines: state.enabledLines,
      }),
    }
  )
);

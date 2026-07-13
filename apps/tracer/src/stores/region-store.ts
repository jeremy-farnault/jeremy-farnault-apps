"use client";

import type { RegionId } from "@/config/game";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type RegionState = {
  discoveredRegionIds: RegionId[];
  discover: (id: RegionId) => void;
  reset: () => void;
};

const DEFAULT_DISCOVERED: RegionId[] = ["home"];

export const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      discoveredRegionIds: DEFAULT_DISCOVERED,

      discover: (id) => {
        if (get().discoveredRegionIds.includes(id)) return;
        set({ discoveredRegionIds: [...get().discoveredRegionIds, id] });
      },

      reset: () => set({ discoveredRegionIds: DEFAULT_DISCOVERED }),
    }),
    {
      name: "tracer:region-store",
      partialize: (state) => ({ discoveredRegionIds: state.discoveredRegionIds }),
    }
  )
);

export function useIsDiscovered(id: RegionId): boolean {
  return useRegionStore((s) => s.discoveredRegionIds.includes(id));
}

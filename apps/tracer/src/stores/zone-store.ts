"use client";

import type { ZoneId } from "@/config/zones";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ZoneState = {
  capturedZoneIds: ZoneId[];
  capture: (id: ZoneId) => void;
  reset: () => void;
};

const DEFAULT_CAPTURED: ZoneId[] = [];

export const useZoneStore = create<ZoneState>()(
  persist(
    (set, get) => ({
      capturedZoneIds: DEFAULT_CAPTURED,

      capture: (id) => {
        if (get().capturedZoneIds.includes(id)) return;
        set({ capturedZoneIds: [...get().capturedZoneIds, id] });
      },

      reset: () => set({ capturedZoneIds: DEFAULT_CAPTURED }),
    }),
    {
      name: "tracer:zone-store",
      partialize: (state) => ({ capturedZoneIds: state.capturedZoneIds }),
    }
  )
);

export function useIsCaptured(id: ZoneId): boolean {
  return useZoneStore((s) => s.capturedZoneIds.includes(id));
}

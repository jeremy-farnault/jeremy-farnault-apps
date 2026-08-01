"use client";

import { EQUIPMENT, type OwnedItem } from "@/config/equipment";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// The only actor that can own gear today; the model carries ownerId so future
// friendly NPCs can be equipped without a schema change.
export const PLAYER_ACTOR_ID = "player";

type EquipmentState = {
  items: OwnedItem[];
  acquire: (defId: string) => void;
  toggle: (instanceId: string) => void;
  reset: () => void;
};

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      items: [],

      acquire: (defId) =>
        set({
          items: [
            ...get().items,
            { instanceId: crypto.randomUUID(), defId, ownerId: PLAYER_ACTOR_ID, active: false },
          ],
        }),

      // Flip an item's active state. Activating enforces the slot rule: any other
      // active item of the same kind, owned by the same actor, is deactivated.
      toggle: (instanceId) => {
        const items = get().items;
        const target = items.find((i) => i.instanceId === instanceId);
        if (!target) return;
        const willActivate = !target.active;
        const kind = EQUIPMENT.find((d) => d.id === target.defId)?.kind;
        set({
          items: items.map((i) => {
            if (i.instanceId === instanceId) return { ...i, active: willActivate };
            if (willActivate && i.active && i.ownerId === target.ownerId) {
              const otherKind = EQUIPMENT.find((d) => d.id === i.defId)?.kind;
              if (otherKind === kind) return { ...i, active: false };
            }
            return i;
          }),
        });
      },

      reset: () => set({ items: [] }),
    }),
    {
      name: "tracer:equipment",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

"use client";

import { applyDecay, defaultStats, pumpAttribute } from "@/lib/stats";
import type { Attributes, CharacterStats } from "@/lib/stats";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type CharacterState = CharacterStats & {
  spendMoney: (amount: number) => boolean;
  earnMoney: (amount: number) => void;
  restoreStats: (hunger: number, thirst: number) => void;
  gainAttribute: (name: keyof Attributes, delta: number) => void;
  applyDecayTick: () => void;
  reset: () => void;
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      ...defaultStats(),

      spendMoney: (amount) => {
        const { money } = get();
        if (money < amount) return false;
        set({ money: money - amount });
        return true;
      },

      earnMoney: (amount) => set({ money: get().money + amount }),

      restoreStats: (hunger, thirst) =>
        set({
          hunger: Math.min(100, get().hunger + hunger),
          thirst: Math.min(100, get().thirst + thirst),
        }),

      gainAttribute: (name, delta) => set(pumpAttribute(get(), name, delta)),

      applyDecayTick: () => set(applyDecay(get())),

      reset: () => set(defaultStats()),
    }),
    {
      name: "tracer:character-store",
      partialize: (state) => ({
        health: state.health,
        hunger: state.hunger,
        thirst: state.thirst,
        knowledge: state.knowledge,
        vigor: state.vigor,
        might: state.might,
        money: state.money,
        lastComputedAt: state.lastComputedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.applyDecayTick();
      },
    }
  )
);

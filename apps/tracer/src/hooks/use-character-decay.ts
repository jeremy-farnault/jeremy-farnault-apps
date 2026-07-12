"use client";

import { useCharacterStore } from "@/stores/character-store";
import { useEffect } from "react";

export function useCharacterDecay(intervalMs = 10_000) {
  useEffect(() => {
    const applyDecayTick = useCharacterStore.getState().applyDecayTick;
    applyDecayTick();
    const id = setInterval(applyDecayTick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

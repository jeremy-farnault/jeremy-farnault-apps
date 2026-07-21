"use client";

import { PLAYER_HOME } from "@/config/game";
import type { Poi } from "@/config/game";
import { loadActionState } from "@/lib/action";
import {
  type CharacterPosition,
  type TravelLeg,
  type TravelState,
  clearTravelState,
  getElapsedSeconds,
  interpolateLegs,
  loadCharacterPosition,
  loadTravelState,
  makeTravelState,
  saveCharacterPosition,
  saveTravelState,
  totalDurationSeconds,
} from "@/lib/travel";
import { useEffect, useState } from "react";

export function useTravel() {
  const [travel, setTravel] = useState<TravelState | null>(() => loadTravelState());
  const [characterPosition, setCharacterPosition] = useState<CharacterPosition>(
    () => loadCharacterPosition() ?? PLAYER_HOME
  );

  useEffect(() => {
    if (!travel) return;
    let raf = 0;
    const total = totalDurationSeconds(travel.legs);

    const tick = () => {
      const elapsed = getElapsedSeconds(travel);
      const pos = interpolateLegs(travel.legs, elapsed);
      setCharacterPosition(pos);

      if (elapsed >= total) {
        saveCharacterPosition(pos);
        clearTravelState();
        setTravel(null);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [travel]);

  function startTravel(poi: Poi, legs: TravelLeg[]) {
    if (loadActionState()) return;
    const state = makeTravelState(poi, legs);
    saveTravelState(state);
    setTravel(state);
  }

  return {
    characterPosition,
    isActive: travel !== null,
    startTravel,
    travel,
  };
}

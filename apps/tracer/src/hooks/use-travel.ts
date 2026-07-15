"use client";

import { PLAYER_HOME } from "@/config/game";
import type { Poi } from "@/config/game";
import { loadActionState } from "@/lib/action";
import type { RouteResult } from "@/lib/directions";
import {
  type CharacterPosition,
  type TravelState,
  clearTravelState,
  getElapsedSeconds,
  interpolateRoute,
  loadCharacterPosition,
  loadTravelState,
  makeTravelState,
  saveCharacterPosition,
  saveTravelState,
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

    const tick = () => {
      const elapsed = getElapsedSeconds(travel);
      const t = Math.min(elapsed / travel.totalDuration, 1);
      const pos = interpolateRoute(travel.routeGeometry.coordinates, t);
      setCharacterPosition(pos);

      if (t >= 1) {
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

  function startTravel(poi: Poi, route: RouteResult) {
    if (loadActionState()) return;
    const state = makeTravelState(poi, route);
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

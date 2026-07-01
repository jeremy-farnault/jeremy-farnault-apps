"use client";

import { PLAYER_HOME } from "@/config/game";
import type { Poi } from "@/config/game";
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

    function tick(state: TravelState) {
      const elapsed = getElapsedSeconds(state);
      const t = Math.min(elapsed / state.totalDuration, 1);
      const pos = interpolateRoute(state.routeGeometry.coordinates, t);
      setCharacterPosition(pos);

      if (t >= 1) {
        saveCharacterPosition(pos);
        clearTravelState();
        setTravel(null);
      }
    }

    tick(travel);
    const id = setInterval(() => tick(travel), 1000);
    return () => clearInterval(id);
  }, [travel]);

  function startTravel(poi: Poi, route: RouteResult) {
    const state = makeTravelState(poi, route);
    saveTravelState(state);
    setTravel(state);
  }

  return {
    characterPosition,
    isActive: travel !== null,
    startTravel,
  };
}

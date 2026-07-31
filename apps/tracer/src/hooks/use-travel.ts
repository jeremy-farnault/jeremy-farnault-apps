"use client";

import type { Poi } from "@/config/game";
import { loadActionState } from "@/lib/action";
import {
  type CharacterPosition,
  type TravelLeg,
  type TravelState,
  clearTravelState,
  getElapsedSeconds,
  interpolateLegs,
  makeTravelState,
  saveCharacterPosition,
  saveTravelState,
  totalDurationSeconds,
} from "@/lib/travel";
import { useTravelStore } from "@/stores/travel-store";
import { useEffect, useRef } from "react";

export function useTravel(onArrive?: (state: TravelState) => void) {
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  const travel = useTravelStore((s) => s.travel);
  const characterPosition = useTravelStore((s) => s.position);
  const setPosition = useTravelStore((s) => s.setPosition);
  const setTravel = useTravelStore((s) => s.setTravel);

  useEffect(() => {
    if (!travel) return;
    let raf = 0;
    const total = totalDurationSeconds(travel.legs);

    const tick = () => {
      const elapsed = getElapsedSeconds(travel);
      const pos = interpolateLegs(travel.legs, elapsed);
      setPosition(pos);

      if (elapsed >= total) {
        saveCharacterPosition(pos);
        clearTravelState();
        setTravel(null);
        onArriveRef.current?.(travel);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [travel, setPosition, setTravel]);

  function startTravel(poi: Poi, legs: TravelLeg[]) {
    if (loadActionState()) return;
    const state = makeTravelState(poi, legs);
    saveTravelState(state);
    setTravel(state);
  }

  // Interrupt an in-progress journey (e.g. an NPC intercepts the player).
  // Persists the current position so the player stays where they were caught.
  function stopTravel() {
    saveCharacterPosition(useTravelStore.getState().position);
    clearTravelState();
    setTravel(null);
  }

  // Instantly move the player to a position (e.g. ejected home after a defeat,
  // or finalized at an offline arrival point). Cancels any in-progress travel.
  function teleport(pos: CharacterPosition) {
    clearTravelState();
    setTravel(null);
    saveCharacterPosition(pos);
    setPosition(pos);
  }

  return {
    characterPosition,
    isActive: travel !== null,
    startTravel,
    stopTravel,
    teleport,
    travel,
  };
}

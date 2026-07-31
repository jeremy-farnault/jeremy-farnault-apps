"use client";

import { PLAYER_HOME } from "@/config/game";
import {
  type CharacterPosition,
  type TravelState,
  loadCharacterPosition,
  loadTravelState,
} from "@/lib/travel";
import { create } from "zustand";

// Shared player position + travel state. Lifted out of the useTravel hook so
// systems outside the map component (e.g. NPC pursuit AI) can read it — via a
// selector for reactive reads, or getState() for imperative, non-re-rendering
// reads. Persistence is NOT owned here: the useTravel hook continues to write
// through lib/travel.ts's save*/clear* functions on the same events as before;
// this store initializes from those same load* functions.
type TravelStore = {
  position: CharacterPosition;
  travel: TravelState | null;
  setPosition: (position: CharacterPosition) => void;
  setTravel: (travel: TravelState | null) => void;
};

export const useTravelStore = create<TravelStore>((set) => ({
  position: loadCharacterPosition() ?? PLAYER_HOME,
  travel: loadTravelState(),
  setPosition: (position) => set({ position }),
  setTravel: (travel) => set({ travel }),
}));

// Where the player is committed to being: the travel destination's coordinates
// while traveling, otherwise the current position (idle, or stationary in a POI
// action). Read imperatively — the NPC AI samples this at decision time.
export function committedEndpoint(): CharacterPosition {
  const { position, travel } = useTravelStore.getState();
  if (travel && travel.destinationLng !== undefined && travel.destinationLat !== undefined) {
    return { longitude: travel.destinationLng, latitude: travel.destinationLat };
  }
  return position;
}

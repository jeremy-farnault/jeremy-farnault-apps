"use client";

import { loadPursuitSnapshot } from "@/lib/pursuit-persist";
import type { CharacterPosition, TravelLeg } from "@/lib/travel";
import { create } from "zustand";

export type PursuitStatus =
  | "idle"
  | "pursuing"
  | "returning"
  | "waiting" // reached the player but they're safe at a POI — holding, will confront on exit
  | "caught" // reached the player in the open — GameMap starts the forced confront
  | "confronting"; // forced confront in progress — hold position until it resolves

// The NPC's current movement path, at its own speed. Time-based like travel:
// position = interpolateLegs(legs, (now - resumedAt) / 1000).
export type PursuitRoute = {
  legs: TravelLeg[];
  resumedAt: number;
};

export type NpcPursuit = {
  status: PursuitStatus;
  livePosition: CharacterPosition;
  route: PursuitRoute | null;
  target: CharacterPosition | null;
};

type PursuitStore = {
  byId: Record<string, NpcPursuit>;
  // Per-NPC "can't re-detect until" timestamp (ms). Kept separate from `byId`
  // so it survives the pursuit record being cleared when the NPC goes idle.
  cooldownUntil: Record<string, number>;
  set: (npcId: string, pursuit: NpcPursuit) => void;
  clear: (npcId: string) => void;
  setCooldown: (npcId: string, until: number) => void;
};

// Per-NPC runtime pursuit state. Populated by the useNpcPursuit loop, read by
// the NPC marker (live position) and, later, by the confront/offline tickets.
// In-memory for now; persistence is the offline-resolution ticket.
const snapshot = loadPursuitSnapshot();

export const usePursuitStore = create<PursuitStore>((set) => ({
  byId: snapshot?.byId ?? {},
  cooldownUntil: snapshot?.cooldownUntil ?? {},
  set: (npcId, pursuit) => set((s) => ({ byId: { ...s.byId, [npcId]: pursuit } })),
  clear: (npcId) =>
    set((s) => {
      if (!(npcId in s.byId)) return s;
      const next = { ...s.byId };
      delete next[npcId];
      return { byId: next };
    }),
  setCooldown: (npcId, until) =>
    set((s) => ({ cooldownUntil: { ...s.cooldownUntil, [npcId]: until } })),
}));

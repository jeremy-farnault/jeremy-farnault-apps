import type { PoiBase } from "@/config/game";

export type Npc = PoiBase & {
  category: "npc";
  might: number;
};

// Ownership is derived, not stored here: an NPC currently controls whichever
// Zone (see @/config/zones) has an `owner` matching `{ npcId: this.id }`. The
// marker disappears the moment that zone's owner flips to "player" — no
// separate zoneId/ownership bookkeeping needed on the NPC itself.
export const NPCS: Npc[] = [
  {
    id: "npc-higashi-jujo",
    label: "Local Enforcer",
    emoji: "🥊",
    longitude: 139.7325,
    latitude: 35.7605,
    regionId: "home",
    category: "npc",
    might: 15,
  },
];

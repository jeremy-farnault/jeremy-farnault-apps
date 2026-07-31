import { POIS } from "@/config/game";
import type { Npc } from "@/config/npcs";
import { ZONES, type Zone } from "@/config/zones";
import type { RouteResult } from "@/lib/directions";
import { distanceMeters, pointInPolygon } from "@/lib/geo";
import type { CharacterPosition, TravelLeg } from "@/lib/travel";

type LngLat = { longitude: number; latitude: number };

// A player standing within this distance of an interactable POI is "safe":
// pursuing NPCs wait outside rather than confront (no fights in shops/schools).
// Matches the action-proximity threshold used for POI interactions.
const SAFE_POI_RADIUS_M = 30;

// True when the player is at (within safe radius of) any interactable POI.
export function isAtPoi(pos: LngLat): boolean {
  return POIS.some((p) => p.category !== "npc" && distanceMeters(pos, p) <= SAFE_POI_RADIUS_M);
}

// True when the player is within the NPC's detection radius of its post (the
// NPC's config coordinates). Pure — the same check the pursuit AI reuses
// against the shared player position.
export function detectsPlayer(npc: Npc, playerPos: LngLat): boolean {
  return (
    distanceMeters(playerPos, { longitude: npc.longitude, latitude: npc.latitude }) <=
    npc.detectionRadius
  );
}

// The hostile zone this NPC currently controls, if any (derived from ownership).
export function npcZone(npc: Npc): Zone | undefined {
  return ZONES.find((z) => typeof z.owner === "object" && z.owner.npcId === npc.id);
}

export function isInZone(pos: LngLat, zone: Zone): boolean {
  return pointInPolygon(pos, zone.boundary);
}

// Build a movement leg for the NPC: follow the route geometry at the NPC's own
// speed (not the walking-route duration). Falls back to a straight line when
// routing is unavailable.
export function buildPursuitLeg(
  route: RouteResult | null,
  from: CharacterPosition,
  to: CharacterPosition,
  speedMps: number
): TravelLeg {
  const speed = Math.max(speedMps, 0.1);
  if (route && route.geometry.coordinates.length >= 2) {
    return {
      coordinates: route.geometry.coordinates,
      durationSec: Math.max(route.distance, 1) / speed,
    };
  }
  const straight: [number, number][] = [
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ];
  return { coordinates: straight, durationSec: Math.max(distanceMeters(from, to), 1) / speed };
}

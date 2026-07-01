import type { Poi } from "@/config/game";
import type { RouteResult } from "@/lib/directions";

export type TravelState = {
  destinationId: string;
  routeGeometry: { type: "LineString"; coordinates: [number, number][] };
  totalDuration: number; // seconds
  accumulatedSeconds: number; // banked progress — 0 for a fresh journey
  resumedAt: number; // wall timestamp when current run started
  // Future pause: bank accumulatedSeconds, set resumedAt = null
};

export type CharacterPosition = {
  longitude: number;
  latitude: number;
};

const TRAVEL_KEY = "tracer:travel";
const POSITION_KEY = "tracer:position";

export function loadTravelState(): TravelState | null {
  try {
    const raw = localStorage.getItem(TRAVEL_KEY);
    return raw ? (JSON.parse(raw) as TravelState) : null;
  } catch {
    return null;
  }
}

export function saveTravelState(state: TravelState): void {
  localStorage.setItem(TRAVEL_KEY, JSON.stringify(state));
}

export function clearTravelState(): void {
  localStorage.removeItem(TRAVEL_KEY);
}

export function loadCharacterPosition(): CharacterPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    return raw ? (JSON.parse(raw) as CharacterPosition) : null;
  } catch {
    return null;
  }
}

export function saveCharacterPosition(pos: CharacterPosition): void {
  localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
}

export function getElapsedSeconds(state: TravelState): number {
  return state.accumulatedSeconds + (Date.now() - state.resumedAt) / 1000;
}

// Segment-by-segment interpolation along a LineString.
// Uses Euclidean distance in coordinate space — sufficient for short walking routes.
export function interpolateRoute(coordinates: [number, number][], t: number): CharacterPosition {
  const first = coordinates[0] ?? [0, 0];
  const last = coordinates[coordinates.length - 1] ?? first;

  if (t <= 0) return { longitude: first[0], latitude: first[1] };
  if (t >= 1) return { longitude: last[0], latitude: last[1] };

  let totalLength = 0;
  const lengths: number[] = [];
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1] ?? [0, 0];
    const curr = coordinates[i] ?? [0, 0];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    lengths.push(Math.sqrt(dx * dx + dy * dy));
    totalLength += lengths[lengths.length - 1] ?? 0;
  }

  const target = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < lengths.length; i++) {
    const segLen = lengths[i] ?? 0;
    if (accumulated + segLen >= target) {
      const segT = (target - accumulated) / segLen;
      const a = coordinates[i] ?? [0, 0];
      const b = coordinates[i + 1] ?? [0, 0];
      return {
        longitude: a[0] + (b[0] - a[0]) * segT,
        latitude: a[1] + (b[1] - a[1]) * segT,
      };
    }
    accumulated += segLen;
  }

  return { longitude: last[0], latitude: last[1] };
}

export function makeTravelState(poi: Poi, route: RouteResult): TravelState {
  return {
    destinationId: poi.id,
    routeGeometry: route.geometry,
    totalDuration: route.duration,
    accumulatedSeconds: 0,
    resumedAt: Date.now(),
  };
}

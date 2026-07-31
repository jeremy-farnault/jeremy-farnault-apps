import type { Poi } from "@/config/game";

export type TravelLeg = {
  coordinates: [number, number][];
  durationSec: number;
};

export type TravelState = {
  destinationId: string;
  destinationLabel?: string; // display name captured at departure; optional — trips in-flight before this field existed won't have it
  destinationLng?: number; // destination coordinates captured at departure — for the committed-endpoint derivation
  destinationLat?: number;
  legs: TravelLeg[];
  accumulatedSeconds: number; // banked progress — 0 for a fresh journey
  resumedAt: number; // wall timestamp when current run started
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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TravelState>;
    // Reject stale/old-shape entries (pre-per-leg animation).
    if (!Array.isArray(parsed.legs)) return null;
    return parsed as TravelState;
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

export function totalDurationSeconds(legs: TravelLeg[]): number {
  return legs.reduce((s, l) => s + l.durationSec, 0);
}

// Geometric interpolation within a single polyline. `t` is proportion of
// total geometric length. Callers control how `t` maps to time — that's
// what `interpolateLegs` does at the leg boundary layer.
function interpolatePolyline(coordinates: [number, number][], t: number): CharacterPosition {
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

  if (totalLength === 0) return { longitude: first[0], latitude: first[1] };

  const target = t * totalLength;
  let accumulated = 0;
  for (let i = 0; i < lengths.length; i++) {
    const segLen = lengths[i] ?? 0;
    if (accumulated + segLen >= target) {
      const segT = segLen > 0 ? (target - accumulated) / segLen : 0;
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

// Time-aware interpolation across a leg chain. Each leg contributes exactly
// `durationSec` seconds of animation time, and within a leg we interpolate
// by geometric distance. This is what makes walking legs feel slow and
// train legs feel fast at the same wall-clock rate.
//
// Empty-coord legs (e.g. transfer segments) hold the last known position
// for the duration of the leg — the character visually pauses at the
// transfer station.
export function interpolateLegs(legs: TravelLeg[], elapsedSec: number): CharacterPosition {
  let lastKnown: [number, number] = [0, 0];
  let remaining = elapsedSec;

  for (const leg of legs) {
    const first = leg.coordinates[0];
    if (first) lastKnown = first;
    if (remaining <= leg.durationSec) {
      if (leg.coordinates.length === 0) {
        return { longitude: lastKnown[0], latitude: lastKnown[1] };
      }
      const subT = leg.durationSec > 0 ? remaining / leg.durationSec : 1;
      return interpolatePolyline(leg.coordinates, subT);
    }
    remaining -= leg.durationSec;
    const last = leg.coordinates[leg.coordinates.length - 1];
    if (last) lastKnown = last;
  }

  return { longitude: lastKnown[0], latitude: lastKnown[1] };
}

export function makeTravelState(poi: Poi, legs: TravelLeg[]): TravelState {
  return {
    destinationId: poi.id,
    destinationLabel: poi.label,
    destinationLng: poi.longitude,
    destinationLat: poi.latitude,
    legs,
    accumulatedSeconds: 0,
    resumedAt: Date.now(),
  };
}

import type { NpcPursuit } from "@/stores/pursuit-store";

const KEY = "tracer:pursuit";

// Durable pursuit snapshot, written only when the app is backgrounded/closed
// (not per frame) and rehydrated on load. Routes carry absolute resumedAt
// timestamps, so they fast-forward correctly on resume — same as travel state.
export type PursuitSnapshot = {
  byId: Record<string, NpcPursuit>;
  cooldownUntil: Record<string, number>;
};

export function savePursuitSnapshot(snapshot: PursuitSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / unavailable storage
  }
}

export function loadPursuitSnapshot(): PursuitSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PursuitSnapshot) : null;
  } catch {
    return null;
  }
}

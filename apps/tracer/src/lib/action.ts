import type { RegionId } from "@/config/game";

const ACTION_KEY = "tracer:action";

export type TimedActionState = {
  type: "meal" | "work" | "explore" | "study" | "train-vigor" | "train-might";
  startedAt: number; // wall timestamp
  duration: number; // seconds
  prepaidCost: number;
  maxStatA: number; // hunger (meal), earnings (work), or attribute gain (training)
  maxStatB: number; // thirst (meal) or 0 (work / training)
  unlocksRegionId?: RegionId; // explore only
};

export function loadActionState(): TimedActionState | null {
  try {
    const raw = localStorage.getItem(ACTION_KEY);
    return raw ? (JSON.parse(raw) as TimedActionState) : null;
  } catch {
    return null;
  }
}

export function saveActionState(state: TimedActionState): void {
  localStorage.setItem(ACTION_KEY, JSON.stringify(state));
}

export function clearActionState(): void {
  localStorage.removeItem(ACTION_KEY);
}

export function getActionProgress(state: TimedActionState): { elapsed: number; t: number } {
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const t = Math.min(elapsed / state.duration, 1);
  return { elapsed, t };
}

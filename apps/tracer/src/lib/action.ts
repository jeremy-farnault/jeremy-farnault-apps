const ACTION_KEY = "tracer:action";

export type TimedActionState = {
  type: "meal" | "work";
  startedAt: number; // wall timestamp
  duration: number; // seconds
  prepaidCost: number;
  maxStatA: number; // hunger (meal) or earnings (work)
  maxStatB: number; // thirst (meal) or 0 (work)
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

"use client";

import {
  type TimedActionState,
  clearActionState,
  getActionProgress,
  loadActionState,
  saveActionState,
} from "@/lib/action";
import { loadTravelState } from "@/lib/travel";
import { useEffect, useRef, useState } from "react";

export function useAction(onComplete?: (finalT: number, state: TimedActionState) => void) {
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [action, setAction] = useState<TimedActionState | null>(() => loadActionState());
  const [t, setT] = useState<number>(() => {
    const loaded = loadActionState();
    return loaded ? getActionProgress(loaded).t : 0;
  });

  useEffect(() => {
    if (!action) {
      setT(0);
      return;
    }

    function tick(state: TimedActionState) {
      const progress = getActionProgress(state);
      setT(progress.t);
      if (progress.t >= 1) {
        clearActionState();
        setAction(null);
        onCompleteRef.current?.(1, state);
      }
    }

    tick(action);
    const id = setInterval(() => tick(action), 1000);
    return () => clearInterval(id);
  }, [action]);

  function startAction(params: Omit<TimedActionState, "startedAt">): boolean {
    if (loadTravelState()) return false;
    if (action) return false;
    const state: TimedActionState = { ...params, startedAt: Date.now() };
    saveActionState(state);
    setAction(state);
    return true;
  }

  function stopAction(): number {
    if (!action) return 0;
    const { t: finalT } = getActionProgress(action);
    clearActionState();
    setAction(null);
    onCompleteRef.current?.(finalT, action);
    return finalT;
  }

  return { action, t, startAction, stopAction };
}

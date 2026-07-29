"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Semantic category for a log entry. Drives the panel's per-line emoji
// (mapped in the panel component, not here) and leaves room for future
// filtering. Keep in sync with the emoji map in the Activity Log panel.
export type LogCategory =
  | "system"
  | "travel"
  | "arrival"
  | "purchase"
  | "consume"
  | "meal"
  | "work"
  | "study"
  | "train"
  | "rest"
  | "confront"
  | "discovery";

export type LogEntry = {
  id: string;
  timestamp: number; // epoch ms
  category: LogCategory;
  message: string;
};

type LogState = {
  entries: LogEntry[];
  add: (category: LogCategory, message: string) => void;
  reset: () => void;
};

// The opening entry present on every fresh save. Preserved across reloads by
// persistence (see below) — never re-added on rehydrate.
function seedEntry(): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    category: "system",
    message: "Woke up at home",
  };
}

export const useLogStore = create<LogState>()(
  persist(
    (set, get) => ({
      // Fresh-save default. On rehydrate, zustand's persist shallow-merges the
      // persisted `entries` over this, replacing the seed with the saved list
      // (which already contains the original seed) — so no duplication and no
      // re-seed. Same mechanism region-store relies on for its ["home"] default.
      entries: [seedEntry()],

      add: (category, message) =>
        set({
          entries: [
            ...get().entries,
            { id: crypto.randomUUID(), timestamp: Date.now(), category, message },
          ],
        }),

      reset: () => set({ entries: [seedEntry()] }),
    }),
    {
      name: "tracer:log-store",
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

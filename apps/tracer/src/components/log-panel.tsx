"use client";

import { type LogCategory, useLogStore } from "@/stores/log-store";
import { useState } from "react";

// Category → emoji for the log rows. Keep in sync with the LogCategory union
// in log-store.ts. Aligned with the game's existing emoji vocabulary
// (🍜 ramen, 💼 work, 📚 Knowledge, 💪 gym).
const CATEGORY_EMOJI: Record<LogCategory, string> = {
  system: "☀️",
  travel: "🚶",
  arrival: "📍",
  purchase: "🛒",
  consume: "🍽️",
  meal: "🍜",
  work: "💼",
  study: "📚",
  train: "💪",
  rest: "😴",
  confront: "⚔️",
  discovery: "🗺️",
};

export function LogPanel() {
  const [expanded, setExpanded] = useState(false);
  const entries = useLogStore((s) => s.entries);

  return (
    <div className="rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-red-500 select-none text-left w-full">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">📜 Log</p>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {entries
            .slice()
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-xs">
                <span className="shrink-0">{CATEGORY_EMOJI[entry.category]}</span>
                <span className="shrink-0 text-(--grey-500) tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-(--grey-200)">{entry.message}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

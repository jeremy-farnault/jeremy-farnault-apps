import type { ChangelogEntry } from "../types";

export const gainerEntries: ChangelogEntry[] = [
  {
    id: "gainer-last-set-hint",
    date: "2026-11-09",
    kind: "fixed",
    title: "The right last set",
    description: "The hint under an exercise shows your actual last set from the previous session.",
    apps: ["gainer"],
  },
  {
    id: "gainer-session-insights",
    date: "2026-06-22",
    kind: "improved",
    title: "More from each session",
    description:
      "Each day shows its volume and best sets, each exercise shows your last set, and you can hide the built-in exercises you don't use.",
    apps: ["gainer"],
  },
  {
    id: "gainer-launch",
    date: "2026-06-21",
    kind: "new",
    title: "Gainer is live",
    description:
      "Log your workouts, from sets and reps to cardio and bodyweight exercises, and watch your strength grow in charts.",
    apps: ["gainer"],
  },
];

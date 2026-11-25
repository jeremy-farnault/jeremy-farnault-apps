import type { ChangelogEntry } from "../types";

export const routinerEntries: ChangelogEntry[] = [
  {
    id: "routiner-heatmap-fixes",
    date: "2026-10-10",
    kind: "fixed",
    title: "The whole year in the heatmap",
    description:
      "On narrow screens the heatmap scrolls back through your full history, and light and dark shades of a colour look different again.",
    apps: ["routiner"],
  },
  {
    id: "routiner-start-in-past",
    date: "2026-09-03",
    kind: "improved",
    title: "Start a habit in the past",
    description:
      "A new habit can start on an earlier date, and it lands in the right place in your sorted list.",
    apps: ["routiner"],
  },
  {
    id: "routiner-time-shades",
    date: "2026-08-30",
    kind: "improved",
    title: "Time habits shade by the minute",
    description:
      "For a time habit, the heatmap's shade follows the exact time you logged, not just the hour.",
    apps: ["routiner"],
  },
  {
    id: "routiner-log-any-day",
    date: "2026-08-02",
    kind: "improved",
    title: "Log any day",
    description: "Pick the date when you log, to fill in a day you missed.",
    apps: ["routiner"],
  },
  {
    id: "routiner-charts",
    date: "2026-05-10",
    kind: "new",
    title: "Charts",
    description: "Switch a habit to a chart to see how its numbers move over time.",
    apps: ["routiner"],
  },
  {
    id: "routiner-launch",
    date: "2026-04-24",
    kind: "new",
    title: "Routiner is live",
    description:
      "Track your habits: done or not, an amount, or a time of day. Each habit shows a year-long heatmap, and you can log today in a tap.",
    apps: ["routiner"],
  },
];

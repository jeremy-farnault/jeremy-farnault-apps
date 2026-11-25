import type { ChangelogEntry } from "../types";

export const organiserEntries: ChangelogEntry[] = [
  {
    id: "organiser-dark-cards",
    date: "2026-10-18",
    kind: "fixed",
    title: "Cards read in dark mode",
    description: "Cards stand out from the board again on a dark background.",
    apps: ["organiser"],
  },
  {
    id: "organiser-drag-and-drop",
    date: "2026-09-19",
    kind: "fixed",
    title: "Smoother drag and drop",
    description: "Cards land where you drop them, on desktop and on touch screens.",
    apps: ["organiser"],
  },
  {
    id: "organiser-important",
    date: "2026-09-08",
    kind: "new",
    title: "Mark a card as important",
    description: "Flag the cards that matter so they stand out on the board.",
    apps: ["organiser"],
  },
  {
    id: "organiser-launch",
    date: "2026-09-06",
    kind: "new",
    title: "Organiser is live",
    description:
      "A personal kanban board: drag cards between columns, tag them, set deadlines and colour-code what matters.",
    apps: ["organiser"],
  },
];

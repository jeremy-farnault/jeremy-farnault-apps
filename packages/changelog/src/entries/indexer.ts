import type { ChangelogEntry } from "../types";

export const indexerEntries: ChangelogEntry[] = [
  {
    id: "indexer-beyond-monorepo",
    date: "2026-11-18",
    kind: "new",
    title: "Work beyond these apps",
    description:
      "A portfolio section for projects that live outside the app suite, like the games.",
    apps: ["indexer"],
  },
  {
    id: "indexer-screenshots",
    date: "2026-11-16",
    kind: "improved",
    title: "Fresh screenshots, light and dark",
    description:
      "Every app's screenshots are now taken automatically from a demo account, in light and dark.",
    apps: ["indexer"],
  },
  {
    id: "indexer-theme-toggle",
    date: "2026-10-24",
    kind: "new",
    title: "Light and dark",
    description: "Pick light or dark from the header, or let it follow your system.",
    apps: ["indexer"],
  },
  {
    id: "indexer-launch",
    date: "2026-08-08",
    kind: "new",
    title: "Indexer is live",
    description:
      "One place to see every app: what each one does, with screenshots and a link to open it.",
    apps: ["indexer"],
  },
];

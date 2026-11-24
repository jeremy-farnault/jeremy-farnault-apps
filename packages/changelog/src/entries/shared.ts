import type { ChangelogEntry } from "../types";

/** Changes to shared code that every app got. */
export const sharedEntries: ChangelogEntry[] = [
  {
    id: "all-dark-mode",
    date: "2026-10-14",
    kind: "new",
    title: "Dark mode",
    description:
      "Every app now comes in light and dark. Pick one from the user menu, or let it follow your system.",
    apps: "all",
  },
];

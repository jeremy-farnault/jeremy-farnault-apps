import type { ChangelogEntry } from "../types";

export const unifierEntries: ChangelogEntry[] = [
  {
    id: "unifier-log-past-touch",
    date: "2026-09-20",
    kind: "improved",
    title: "Log a past contact",
    description: "Log a catch-up on the day it happened, not just today.",
    apps: ["unifier"],
  },
  {
    id: "unifier-launch",
    date: "2026-09-14",
    kind: "new",
    title: "Unifier is live",
    description:
      "Sort the people who matter into arcs and log a contact in a tap. The orbit shows who you haven't spoken to in a while.",
    apps: ["unifier"],
  },
];

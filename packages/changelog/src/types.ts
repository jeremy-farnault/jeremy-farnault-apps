/**
 * The apps with a changelog: every app in `@jf/ui`'s app registry, plus Indexer. A test
 * checks this list against the registry, so a new app fails until it's added here.
 */
export const CHANGELOG_APP_IDS = [
  "aider",
  "classer",
  "doser",
  "exposer",
  "financer",
  "gainer",
  "indexer",
  "journaler",
  "noter",
  "organiser",
  "placer",
  "routiner",
  "scanner",
  "tracer",
  "unifier",
] as const;

export type ChangelogAppId = (typeof CHANGELOG_APP_IDS)[number];

export const CHANGELOG_KINDS = ["new", "improved", "fixed"] as const;

export type ChangelogKind = (typeof CHANGELOG_KINDS)[number];

/** One change a user would notice, written for visitors. */
export interface ChangelogEntry {
  /** Unique and stable, e.g. "financer-faster-spending-input". */
  id: string;
  /** The day it shipped, as an ISO date: "2026-11-24". */
  date: string;
  kind: ChangelogKind;
  title: string;
  /** One or two lines. */
  description: string;
  /** The apps it shows in, or "all" for a change to shared code that every app got. */
  apps: readonly ChangelogAppId[] | "all";
}

/** One month of a changelog, newest entry first. */
export interface ChangelogMonth {
  /** "2026-11" */
  month: string;
  entries: ChangelogEntry[];
}

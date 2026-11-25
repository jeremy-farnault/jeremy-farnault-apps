import { allEntries } from "./entries";
import type { ChangelogAppId, ChangelogEntry, ChangelogMonth } from "./types";

function newestFirst(a: ChangelogEntry, b: ChangelogEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function byMonth(entries: readonly ChangelogEntry[]): ChangelogMonth[] {
  const months: ChangelogMonth[] = [];
  for (const entry of [...entries].sort(newestFirst)) {
    const month = entry.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }
  return months;
}

/**
 * An app's changelog: its own entries and the "all" ones, newest first, grouped by month.
 * `entries` defaults to the real ones; tests pass their own.
 */
export function appChangelog(
  appId: ChangelogAppId,
  entries: readonly ChangelogEntry[] = allEntries
): ChangelogMonth[] {
  return byMonth(entries.filter((e) => e.apps === "all" || e.apps.includes(appId)));
}

/**
 * The combined changelog, for Indexer: every entry once ("all" ones included), newest first,
 * grouped by month. With `appId`, only the entries naming that app, plus the "all" ones.
 */
export function combinedChangelog(
  appId?: ChangelogAppId,
  entries: readonly ChangelogEntry[] = allEntries
): ChangelogMonth[] {
  return appId === undefined ? byMonth(entries) : appChangelog(appId, entries);
}

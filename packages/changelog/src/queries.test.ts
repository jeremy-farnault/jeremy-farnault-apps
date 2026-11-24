import { describe, expect, it } from "vitest";
import { appChangelog } from "./queries";
import type { ChangelogEntry } from "./types";

function entry(
  id: string,
  date: string,
  apps: ChangelogEntry["apps"] = ["financer"]
): ChangelogEntry {
  return { id, date, kind: "new", title: id, description: id, apps };
}

const ids = (months: ReturnType<typeof appChangelog>) =>
  months.map((m) => [m.month, m.entries.map((e) => e.id)]);

describe("appChangelog", () => {
  it("keeps the app's own entries and the 'all' ones, and drops other apps'", () => {
    const entries = [
      entry("own", "2026-11-03"),
      entry("shared", "2026-11-02", "all"),
      entry("other", "2026-11-01", ["noter"]),
      entry("both", "2026-11-04", ["noter", "financer"]),
    ];
    expect(ids(appChangelog("financer", entries))).toEqual([
      ["2026-11", ["both", "own", "shared"]],
    ]);
  });

  it("puts the newest first and groups by month, across a year boundary", () => {
    const entries = [
      entry("dec", "2025-12-31"),
      entry("jan-early", "2026-01-01"),
      entry("feb", "2026-02-10"),
      entry("jan-late", "2026-01-20"),
    ];
    expect(ids(appChangelog("financer", entries))).toEqual([
      ["2026-02", ["feb"]],
      ["2026-01", ["jan-late", "jan-early"]],
      ["2025-12", ["dec"]],
    ]);
  });

  it("orders entries of the same day by id, so the order never depends on the files", () => {
    const entries = [entry("b", "2026-11-01"), entry("a", "2026-11-01")];
    expect(ids(appChangelog("financer", entries))).toEqual([["2026-11", ["a", "b"]]]);
  });

  it("returns no months for an app with no entries", () => {
    expect(appChangelog("tracer", [entry("own", "2026-11-03")])).toEqual([]);
  });
});

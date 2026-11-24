import { apps } from "@jf/ui/config/apps";
import { describe, expect, it } from "vitest";
import { allEntries } from "./entries";
import { CHANGELOG_APP_IDS, CHANGELOG_KINDS } from "./types";

// Runs over the real entry files: a bad entry fails here before it goes public.
describe("the changelog entries", () => {
  it("cover exactly the registry's apps plus Indexer", () => {
    expect([...CHANGELOG_APP_IDS].sort()).toEqual([...apps.map((a) => a.id), "indexer"].sort());
  });

  it("have unique ids", () => {
    const ids = allEntries.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it.each(allEntries.map((e) => [e.id, e] as const))("%s is valid", (_id, e) => {
    expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${e.date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(e.date);
    expect(e.date <= new Date().toISOString().slice(0, 10)).toBe(true);
    expect(CHANGELOG_KINDS).toContain(e.kind);
    expect(e.title.trim()).not.toBe("");
    expect(e.description.trim()).not.toBe("");
    if (e.apps !== "all") {
      expect(e.apps.length).toBeGreaterThan(0);
      for (const app of e.apps) expect(CHANGELOG_APP_IDS).toContain(app);
    }
  });
});

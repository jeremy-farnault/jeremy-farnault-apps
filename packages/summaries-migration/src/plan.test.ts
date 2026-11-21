import { describe, expect, it } from "vitest";
import {
  type Source,
  type SourceSummary,
  planSourceSummaries,
  planSpendingSummaries,
} from "./plan";

function ids(prefix = "new") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

const nordnet: Source = { id: "src-nordnet", userId: "me", name: "Nordnet", currency: "SEK" };
const bank: Source = { id: "src-bank", userId: "me", name: "Bank", currency: "NZD" };

function summary(id: string, name: string, currency: string, userId = "me"): SourceSummary {
  return { id, userId, name, currency };
}

describe("planSourceSummaries", () => {
  it("attaches a summary to the one source with the same name and currency", () => {
    const plan = planSourceSummaries(
      [summary("s1", "Nordnet", "SEK"), summary("s2", "Bank", "NZD")],
      [nordnet, bank],
      ids()
    );

    expect(plan.links).toEqual([
      { summaryId: "s1", sourceId: "src-nordnet" },
      { summaryId: "s2", sourceId: "src-bank" },
    ]);
    expect(plan.matchedCount).toBe(2);
    expect(plan.sourcesToCreate).toEqual([]);
    expect(plan.ambiguous).toEqual([]);
    expect(plan.otherCurrency).toEqual([]);
  });

  it("creates one source for summaries with no match, and attaches them all to it", () => {
    const plan = planSourceSummaries(
      [summary("s1", "Old savings", "EUR"), summary("s2", "Old savings", "EUR")],
      [nordnet],
      ids()
    );

    expect(plan.sourcesToCreate).toEqual([
      { id: "new-1", userId: "me", name: "Old savings", currency: "EUR", summaryCount: 2 },
    ]);
    expect(plan.links).toEqual([
      { summaryId: "s1", sourceId: "new-1" },
      { summaryId: "s2", sourceId: "new-1" },
    ]);
    expect(plan.matchedCount).toBe(0);
    expect(plan.otherCurrency).toEqual([]);
  });

  it("treats the same name in another currency as no match, and warns", () => {
    const plan = planSourceSummaries([summary("s1", "Nordnet", "EUR")], [nordnet], ids());

    expect(plan.sourcesToCreate).toEqual([
      { id: "new-1", userId: "me", name: "Nordnet", currency: "EUR", summaryCount: 1 },
    ]);
    expect(plan.links).toEqual([{ summaryId: "s1", sourceId: "new-1" }]);
    expect(plan.otherCurrency).toEqual([
      { userId: "me", name: "Nordnet", currency: "EUR", existingCurrencies: ["SEK"] },
    ]);
  });

  it("reports two sources with the same name and currency as ambiguous and links nothing", () => {
    const twin: Source = { ...nordnet, id: "src-nordnet-2" };
    const plan = planSourceSummaries(
      [
        summary("s1", "Nordnet", "SEK"),
        summary("s2", "Nordnet", "SEK"),
        summary("s3", "Bank", "NZD"),
      ],
      [nordnet, twin, bank],
      ids()
    );

    expect(plan.ambiguous).toEqual([
      {
        userId: "me",
        name: "Nordnet",
        currency: "SEK",
        sourceIds: ["src-nordnet", "src-nordnet-2"],
        summaryCount: 2,
      },
    ]);
    expect(plan.links).toEqual([{ summaryId: "s3", sourceId: "src-bank" }]);
    expect(plan.sourcesToCreate).toEqual([]);
  });

  it("never matches one user's summary to another user's source", () => {
    const plan = planSourceSummaries(
      [summary("s1", "Nordnet", "SEK", "someone-else")],
      [nordnet],
      ids()
    );

    expect(plan.matchedCount).toBe(0);
    expect(plan.sourcesToCreate).toEqual([
      { id: "new-1", userId: "someone-else", name: "Nordnet", currency: "SEK", summaryCount: 1 },
    ]);
    expect(plan.links).toEqual([{ summaryId: "s1", sourceId: "new-1" }]);
    expect(plan.otherCurrency).toEqual([]);
  });

  it("matches names exactly, so a source renamed since the close is not matched", () => {
    const plan = planSourceSummaries([summary("s1", "nordnet", "SEK")], [nordnet], ids());

    expect(plan.matchedCount).toBe(0);
    expect(plan.sourcesToCreate).toHaveLength(1);
  });

  it("links every summary exactly once, keeping its id", () => {
    const summaries = [
      summary("s1", "Nordnet", "SEK"),
      summary("s2", "Gone", "SEK"),
      summary("s3", "Nordnet", "EUR"),
    ];
    const plan = planSourceSummaries(summaries, [nordnet], ids());

    expect(plan.links.map((l) => l.summaryId)).toEqual(["s1", "s2", "s3"]);
  });

  it("plans nothing when there are no summaries", () => {
    const plan = planSourceSummaries([], [nordnet], ids());
    expect(plan).toEqual({
      links: [],
      matchedCount: 0,
      sourcesToCreate: [],
      ambiguous: [],
      otherCurrency: [],
    });
  });
});

describe("planSpendingSummaries", () => {
  const categories = [
    { userId: "me", name: "Groceries" },
    { userId: "me", name: "Transport" },
  ];

  it("moves every summary, keeping its id, and creates nothing when categories exist", () => {
    const plan = planSpendingSummaries(
      [
        { id: "s1", userId: "me", category: "Groceries" },
        { id: "s2", userId: "me", category: "Transport" },
      ],
      categories
    );

    expect(plan).toEqual({ summaryIds: ["s1", "s2"], categoriesToCreate: [] });
  });

  it("creates a category that no longer exists, once per user and name", () => {
    const plan = planSpendingSummaries(
      [
        { id: "s1", userId: "me", category: "Food" },
        { id: "s2", userId: "me", category: "Food" },
        { id: "s3", userId: "me", category: "Groceries" },
      ],
      categories
    );

    expect(plan.summaryIds).toEqual(["s1", "s2", "s3"]);
    expect(plan.categoriesToCreate).toEqual([{ userId: "me", name: "Food", summaryCount: 2 }]);
  });

  it("never counts another user's category as existing", () => {
    const plan = planSpendingSummaries(
      [{ id: "s1", userId: "someone-else", category: "Groceries" }],
      categories
    );

    expect(plan.categoriesToCreate).toEqual([
      { userId: "someone-else", name: "Groceries", summaryCount: 1 },
    ]);
  });
});

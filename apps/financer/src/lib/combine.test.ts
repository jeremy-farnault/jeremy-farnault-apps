import { describe, expect, it } from "vitest";
import {
  type SpendingCombineEntry,
  fromCents,
  planSourceCombine,
  planSpendingCombine,
  sameTotals,
  sourceTotals,
  spendingTotals,
  toCents,
} from "./combine";

function spend(id: string, category: string, currency: string, value: string) {
  return { id, category, currency, value };
}

/** What the month looks like after a combine: originals out, merged entries in. */
function applySpending(entries: SpendingCombineEntry[]) {
  const groups = planSpendingCombine(entries);
  const replaced = new Set(groups.flatMap((g) => g.ids));
  return [
    ...entries.filter((e) => !replaced.has(e.id)),
    ...groups.map((g, i) => ({
      id: `merged-${i}`,
      category: g.category,
      currency: g.currency,
      value: g.total,
    })),
  ];
}

describe("planSpendingCombine", () => {
  it("merges several entries in one category into one entry with their sum", () => {
    const groups = planSpendingCombine([
      spend("a", "Groceries", "SEK", "120.50"),
      spend("b", "Groceries", "SEK", "79.50"),
      spend("c", "Groceries", "SEK", "5"),
    ]);

    expect(groups).toEqual([
      { category: "Groceries", currency: "SEK", ids: ["a", "b", "c"], total: "205.00" },
    ]);
  });

  it("keeps one category in two currencies apart", () => {
    const groups = planSpendingCombine([
      spend("a", "Restaurant", "SEK", "300.00"),
      spend("b", "Restaurant", "EUR", "20.00"),
      spend("c", "Restaurant", "SEK", "150.00"),
      spend("d", "Restaurant", "EUR", "12.30"),
    ]);

    expect(groups).toEqual([
      { category: "Restaurant", currency: "EUR", ids: ["b", "d"], total: "32.30" },
      { category: "Restaurant", currency: "SEK", ids: ["a", "c"], total: "450.00" },
    ]);
  });

  it("leaves a group with a single entry alone", () => {
    const groups = planSpendingCombine([
      spend("a", "Housing", "SEK", "9000.00"),
      spend("b", "Groceries", "SEK", "10.00"),
      spend("c", "Groceries", "SEK", "20.00"),
    ]);

    expect(groups.map((g) => g.category)).toEqual(["Groceries"]);
  });

  it("plans nothing when run on its own result", () => {
    const month = [
      spend("a", "Groceries", "SEK", "10.00"),
      spend("b", "Groceries", "SEK", "20.00"),
      spend("c", "Transport", "EUR", "3.10"),
      spend("d", "Transport", "EUR", "4.20"),
      spend("e", "Housing", "SEK", "9000.00"),
    ];

    expect(planSpendingCombine(applySpending(month))).toEqual([]);
  });

  it("sums exactly to the cent", () => {
    const groups = planSpendingCombine([
      spend("a", "Other", "SEK", "0.10"),
      spend("b", "Other", "SEK", "0.20"),
    ]);

    expect(groups[0]?.total).toBe("0.30");
  });

  it("keeps every category and currency total unchanged", () => {
    const month = [
      spend("a", "Groceries", "SEK", "10.05"),
      spend("b", "Groceries", "SEK", "20.10"),
      spend("c", "Groceries", "EUR", "1.99"),
      spend("d", "Transport", "SEK", "44.00"),
    ];

    expect(sameTotals(spendingTotals(month), spendingTotals(applySpending(month)))).toBe(true);
  });

  it("plans nothing for an empty month", () => {
    expect(planSpendingCombine([])).toEqual([]);
  });
});

describe("planSourceCombine", () => {
  it("merges per source and never across sources", () => {
    const groups = planSourceCombine([
      { id: "a", sourceId: "salary", value: "42000.00" },
      { id: "b", sourceId: "freelance", value: "300.00" },
      { id: "c", sourceId: "salary", value: "2500.00" },
      { id: "d", sourceId: "bonus", value: "1000.00" },
    ]);

    expect(groups).toEqual([{ sourceId: "salary", ids: ["a", "c"], total: "44500.00" }]);
  });

  it("handles negative amounts, down to a zero total", () => {
    const groups = planSourceCombine([
      { id: "a", sourceId: "broker", value: "-50.50" },
      { id: "b", sourceId: "broker", value: "20.25" },
      { id: "c", sourceId: "refund", value: "-10.00" },
      { id: "d", sourceId: "refund", value: "10.00" },
    ]);

    expect(groups).toEqual([
      { sourceId: "broker", ids: ["a", "b"], total: "-30.25" },
      { sourceId: "refund", ids: ["c", "d"], total: "0.00" },
    ]);
  });

  it("keeps every source total unchanged", () => {
    const month = [
      { id: "a", sourceId: "nordnet", value: "100000.01" },
      { id: "b", sourceId: "nordnet", value: "0.02" },
      { id: "c", sourceId: "bank", value: "5.00" },
    ];
    const groups = planSourceCombine(month);
    const replaced = new Set(groups.flatMap((g) => g.ids));
    const after = [
      ...month.filter((e) => !replaced.has(e.id)),
      ...groups.map((g) => ({ id: "merged", sourceId: g.sourceId, value: g.total })),
    ];

    expect(sameTotals(sourceTotals(month), sourceTotals(after))).toBe(true);
    expect(planSourceCombine(after)).toEqual([]);
  });
});

describe("toCents and fromCents", () => {
  it("round-trips the amounts the database returns", () => {
    for (const value of ["0.00", "0.30", "12.50", "-402.91", "1501580.00", "9999999999.99"]) {
      expect(fromCents(toCents(value))).toBe(value);
    }
  });

  it("accepts amounts with fewer decimals", () => {
    expect(toCents("5")).toBe(500);
    expect(toCents("0.3")).toBe(30);
    expect(toCents("-0.5")).toBe(-50);
  });

  it("refuses anything else", () => {
    for (const value of ["", "abc", "1.234", "1e3", "1,50"]) {
      expect(() => toCents(value), value).toThrow();
    }
  });
});

describe("sameTotals", () => {
  it("spots a changed, missing or extra total", () => {
    const base = new Map([
      ["a", 100],
      ["b", 200],
    ]);
    expect(sameTotals(base, new Map(base))).toBe(true);
    expect(
      sameTotals(
        base,
        new Map([
          ["a", 100],
          ["b", 201],
        ])
      )
    ).toBe(false);
    expect(sameTotals(base, new Map([["a", 100]]))).toBe(false);
    expect(sameTotals(base, new Map([...base, ["c", 0]]))).toBe(false);
  });
});

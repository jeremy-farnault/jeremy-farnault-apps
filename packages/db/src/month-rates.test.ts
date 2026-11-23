import { describe, expect, it } from "vitest";

import { backfillRows, resolveMonthRates } from "./month-rates";

const live = { USD: 1, EUR: 0.9, SEK: 9.8 };

describe("resolveMonthRates", () => {
  it("gives the current month the live rates, even when it has stored rows", () => {
    const rates = resolveMonthRates({
      live,
      stored: [{ currency: "SEK", month: "2026-11", rate: 10.5 }],
      months: ["2026-11"],
      currentMonth: "2026-11",
    });
    expect(rates["2026-11"]).toEqual(live);
  });

  it("gives a past month its stored rates", () => {
    const rates = resolveMonthRates({
      live,
      stored: [
        { currency: "USD", month: "2026-10", rate: 1 },
        { currency: "EUR", month: "2026-10", rate: 0.86 },
        { currency: "SEK", month: "2026-10", rate: 9.4 },
      ],
      months: ["2026-10"],
      currentMonth: "2026-11",
    });
    expect(rates["2026-10"]).toEqual({ USD: 1, EUR: 0.86, SEK: 9.4 });
  });

  it("falls back to the live rate for a currency a past month lacks, keeping the others", () => {
    const rates = resolveMonthRates({
      live,
      stored: [{ currency: "SEK", month: "2026-10", rate: 9.4 }],
      months: ["2026-10"],
      currentMonth: "2026-11",
    });
    expect(rates["2026-10"]).toEqual({ USD: 1, EUR: 0.9, SEK: 9.4 });
  });

  it("gives a past month with no stored rows the live rates", () => {
    const rates = resolveMonthRates({
      live,
      stored: [],
      months: ["2025-03"],
      currentMonth: "2026-11",
    });
    expect(rates["2025-03"]).toEqual(live);
  });

  it("gives each month asked for its own rates", () => {
    const rates = resolveMonthRates({
      live,
      stored: [
        { currency: "SEK", month: "2026-09", rate: 9.2 },
        { currency: "SEK", month: "2026-10", rate: 9.4 },
      ],
      months: ["2026-11", "2026-10", "2026-09", "2026-08"],
      currentMonth: "2026-11",
    });
    expect(rates["2026-11"]?.SEK).toBe(9.8);
    expect(rates["2026-10"]?.SEK).toBe(9.4);
    expect(rates["2026-09"]?.SEK).toBe(9.2);
    expect(rates["2026-08"]?.SEK).toBe(9.8);
  });
});

describe("backfillRows", () => {
  const currencies = ["USD", "EUR", "SEK"];

  it("takes each month's last business day when the month ends on a weekend", () => {
    // 2026-10-31 is a Saturday, so October's last business day is Friday the 30th.
    const rows = backfillRows({
      daily: {
        "2026-10-29": { USD: 1, EUR: 0.89, SEK: 9.7 },
        "2026-10-30": { USD: 1, EUR: 0.895, SEK: 9.83 },
      },
      currencies,
      fromMonth: "2026-10",
      currentMonth: "2026-11",
      stored: [],
    });
    expect(rows).toEqual([
      { currency: "USD", month: "2026-10", rate: 1 },
      { currency: "EUR", month: "2026-10", rate: 0.895 },
      { currency: "SEK", month: "2026-10", rate: 9.83 },
    ]);
  });

  it("gives every supported currency a row for each month in range", () => {
    const rows = backfillRows({
      daily: {
        "2026-07-31": { USD: 1, EUR: 0.86, SEK: 9.5 },
        "2026-08-31": { USD: 1, EUR: 0.862, SEK: 9.58 },
        "2026-09-30": { USD: 1, EUR: 0.87, SEK: 9.6 },
      },
      currencies,
      fromMonth: "2026-07",
      currentMonth: "2026-10",
      stored: [],
    });
    expect(rows).toHaveLength(9);
    expect(rows.filter((r) => r.month === "2026-08").map((r) => r.rate)).toEqual([1, 0.862, 9.58]);
  });

  it("skips a month and currency that already has a stored rate", () => {
    const rows = backfillRows({
      daily: { "2026-09-30": { USD: 1, EUR: 0.87, SEK: 9.6 } },
      currencies,
      fromMonth: "2026-09",
      currentMonth: "2026-10",
      stored: [{ currency: "SEK", month: "2026-09" }],
    });
    expect(rows.map((r) => r.currency)).toEqual(["USD", "EUR"]);
  });

  it("never writes the current month", () => {
    const rows = backfillRows({
      daily: {
        "2026-10-30": { USD: 1, EUR: 0.895, SEK: 9.83 },
        "2026-11-20": { USD: 1, EUR: 0.91, SEK: 10.2 },
      },
      currencies,
      fromMonth: "2026-10",
      currentMonth: "2026-11",
      stored: [],
    });
    expect(rows.every((r) => r.month === "2026-10")).toBe(true);
  });

  it("crosses year ends", () => {
    const rows = backfillRows({
      daily: {
        "2025-12-31": { USD: 1, EUR: 0.85, SEK: 9.2 },
        "2026-01-30": { USD: 1, EUR: 0.84, SEK: 9.1 },
      },
      currencies: ["SEK"],
      fromMonth: "2025-12",
      currentMonth: "2026-02",
      stored: [],
    });
    expect(rows).toEqual([
      { currency: "SEK", month: "2025-12", rate: 9.2 },
      { currency: "SEK", month: "2026-01", rate: 9.1 },
    ]);
  });
});

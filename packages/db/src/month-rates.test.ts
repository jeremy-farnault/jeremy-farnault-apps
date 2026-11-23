import { describe, expect, it } from "vitest";

import { resolveMonthRates } from "./month-rates";

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

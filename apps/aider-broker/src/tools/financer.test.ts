import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./financer-query", () => ({
  getCurrentAssets: vi.fn(),
}));

import { executeGetCurrentAssets } from "./financer";
import { getCurrentAssets } from "./financer-query";

const mockedGetCurrentAssets = vi.mocked(getCurrentAssets);

describe("executeGetCurrentAssets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    mockedGetCurrentAssets.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queries the current UTC month and converts the total into the home currency", async () => {
    // Rates are USD-based (units per 1 USD). EUR 1000 -> USD: 1000 * (1 / 0.9) ≈ 1111.11.
    mockedGetCurrentAssets.mockResolvedValue({
      homeCurrency: "USD",
      rates: { USD: 1, EUR: 0.9 },
      rows: [
        { name: "Bank", currency: "USD", value: 500 },
        { name: "Broker", currency: "EUR", value: 1000 },
      ],
    });

    const result = await executeGetCurrentAssets("user-1", {});

    expect(mockedGetCurrentAssets).toHaveBeenCalledWith("user-1", "2026-09");
    expect(JSON.parse(result)).toEqual({
      month: "2026-09",
      home_currency: "USD",
      total: 1611.11,
      by_source: [
        { name: "Bank", value: 500, currency: "USD" },
        { name: "Broker", value: 1000, currency: "EUR" },
      ],
    });
  });

  it("falls back to the raw amount when a currency rate is missing", async () => {
    mockedGetCurrentAssets.mockResolvedValue({
      homeCurrency: "USD",
      rates: { USD: 1 }, // no JPY rate
      rows: [{ name: "Yen Stash", currency: "JPY", value: 300 }],
    });

    const result = await executeGetCurrentAssets("user-1", {});
    expect(JSON.parse(result)).toMatchObject({ total: 300 });
  });

  it("returns a zero total and empty breakdown when there are no assets", async () => {
    mockedGetCurrentAssets.mockResolvedValue({ homeCurrency: "EUR", rates: {}, rows: [] });

    const result = await executeGetCurrentAssets("user-1", {});
    expect(JSON.parse(result)).toEqual({
      month: "2026-09",
      home_currency: "EUR",
      total: 0,
      by_source: [],
    });
  });

  it("caps the by_source breakdown at 50", async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      name: `Source ${i}`,
      currency: "USD",
      value: 1,
    }));
    mockedGetCurrentAssets.mockResolvedValue({ homeCurrency: "USD", rates: { USD: 1 }, rows });

    const result = await executeGetCurrentAssets("user-1", {});
    const parsed = JSON.parse(result);
    expect(parsed.by_source).toHaveLength(50);
    expect(parsed.total).toBe(60); // total still sums all rows
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetCurrentAssets.mockRejectedValue(new Error("db down"));
    const result = await executeGetCurrentAssets("user-1", {});
    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

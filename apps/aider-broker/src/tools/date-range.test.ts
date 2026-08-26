import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseDateRangeArgs } from "./date-range";

describe("parseDateRangeArgs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses a valid ISO range", () => {
    const result = parseDateRangeArgs({ start_date: "2026-08-17", end_date: "2026-08-23" });
    expect(result).toEqual({
      startDate: new Date("2026-08-17"),
      endDate: new Date("2026-08-23"),
    });
  });

  it("swaps start and end when reversed", () => {
    const result = parseDateRangeArgs({ start_date: "2026-08-23", end_date: "2026-08-17" });
    expect(result).toEqual({
      startDate: new Date("2026-08-17"),
      endDate: new Date("2026-08-23"),
    });
  });

  it("returns null when fields are missing or not strings", () => {
    expect(parseDateRangeArgs({ start_date: "2026-08-17" })).toBeNull();
    expect(parseDateRangeArgs({})).toBeNull();
    expect(parseDateRangeArgs(null)).toBeNull();
  });

  it("returns null for unparseable date strings", () => {
    expect(parseDateRangeArgs({ start_date: "not-a-date", end_date: "2026-08-23" })).toBeNull();
  });

  it("clamps end_date to now when it's in the future", () => {
    const result = parseDateRangeArgs({
      start_date: "2026-08-01",
      end_date: "2027-01-01",
    });
    expect(result?.endDate).toEqual(new Date("2026-08-23T00:00:00.000Z"));
  });

  it("clamps the range to MAX_RANGE_DAYS from the end", () => {
    const result = parseDateRangeArgs({
      start_date: "2020-01-01",
      end_date: "2026-08-23",
    });
    expect(result).not.toBeNull();
    const days =
      ((result as { startDate: Date; endDate: Date }).endDate.getTime() -
        (result as { startDate: Date; endDate: Date }).startDate.getTime()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBeCloseTo(366, 5);
  });
});

// Deterministic period resolution — the reason the model no longer computes
// dates itself. "Now" is Wednesday 2026-08-26 (Monday of that week is the 24th).
describe("parseDateRangeArgs period resolution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
  function resolvedRange(raw: unknown): { startDate: Date; endDate: Date } {
    const result = parseDateRangeArgs(raw);
    if (!result) throw new Error("expected a resolved range");
    return result;
  }

  it("resolves this_week to Monday-through-now", () => {
    const range = resolvedRange({ period: "this_week" });
    expect(dateOnly(range.startDate)).toBe("2026-08-24"); // Monday
    expect(dateOnly(range.endDate)).toBe("2026-08-26"); // now
  });

  it("resolves last_week to the prior Monday-through-Sunday", () => {
    const range = resolvedRange({ period: "last_week" });
    expect(dateOnly(range.startDate)).toBe("2026-08-17");
    expect(dateOnly(range.endDate)).toBe("2026-08-23");
  });

  it("resolves this_month from the 1st through now", () => {
    const range = resolvedRange({ period: "this_month" });
    expect(dateOnly(range.startDate)).toBe("2026-08-01");
    expect(dateOnly(range.endDate)).toBe("2026-08-26");
  });

  it("resolves last_month to its full span", () => {
    const range = resolvedRange({ period: "last_month" });
    expect(dateOnly(range.startDate)).toBe("2026-07-01");
    expect(dateOnly(range.endDate)).toBe("2026-07-31");
  });

  it("resolves a specific calendar month to its full span", () => {
    const range = resolvedRange({ month: "2026-07" });
    expect(dateOnly(range.startDate)).toBe("2026-07-01");
    expect(dateOnly(range.endDate)).toBe("2026-07-31");
  });

  it("returns null for a malformed month", () => {
    expect(parseDateRangeArgs({ month: "August" })).toBeNull();
    expect(parseDateRangeArgs({ month: "2026-13" })).toBeNull();
  });

  it("returns null for an unknown period", () => {
    expect(parseDateRangeArgs({ period: "last_decade" })).toBeNull();
  });
});

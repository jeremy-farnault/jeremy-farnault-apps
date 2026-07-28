import { describe, expect, it } from "vitest";
import {
  type CyclePattern,
  addMonths,
  computeOnOff,
  datesInRange,
  formatDateLabel,
  formatMonthLabel,
  getMonthBounds,
  parseMonthParam,
  resolveOnOff,
} from "./cycle";

// 22 days on, 4 days off — cycle length 26, starting 2024-01-20.
// On days: cycle-day 0-21 (2024-01-20 .. 2024-02-10)
// Off days: cycle-day 22-25 (2024-02-11 .. 2024-02-14)
// Wraps back to on at 2024-02-15 (cycle-day 0 of the next cycle).
const pattern: CyclePattern = {
  cycleStartDate: "2024-01-20",
  daysOn: 22,
  daysOff: 4,
};

describe("computeOnOff", () => {
  it("is on on the first day of the cycle", () => {
    expect(computeOnOff(pattern, "2024-01-20")).toBe(true);
  });

  it("is on on the last on-day", () => {
    expect(computeOnOff(pattern, "2024-02-10")).toBe(true);
  });

  it("is off on the first off-day", () => {
    expect(computeOnOff(pattern, "2024-02-11")).toBe(false);
  });

  it("is off on the last off-day", () => {
    expect(computeOnOff(pattern, "2024-02-14")).toBe(false);
  });

  it("wraps back to on across the month boundary", () => {
    expect(computeOnOff(pattern, "2024-02-15")).toBe(true);
  });

  it("resolves dates before cycleStartDate using the same periodic pattern", () => {
    // 5 days before start = cycle-day 21 of the implied previous cycle → on.
    expect(computeOnOff(pattern, "2024-01-15")).toBe(true);
    // 3 days before start = cycle-day 23 of the implied previous cycle → off.
    expect(computeOnOff(pattern, "2024-01-17")).toBe(false);
  });
});

describe("resolveOnOff", () => {
  it("uses the computed value when there is no override", () => {
    expect(resolveOnOff(pattern, "2024-01-20", undefined)).toBe(true);
    expect(resolveOnOff(pattern, "2024-02-11", undefined)).toBe(false);
  });

  it("lets an override flip a computed on-day to off", () => {
    expect(resolveOnOff(pattern, "2024-01-20", { isOn: false })).toBe(false);
  });

  it("lets an override flip a computed off-day to on", () => {
    expect(resolveOnOff(pattern, "2024-02-11", { isOn: true })).toBe(true);
  });
});

describe("datesInRange", () => {
  it("returns every ISO date across a month boundary, inclusive", () => {
    expect(datesInRange("2024-01-30", "2024-02-02")).toEqual([
      "2024-01-30",
      "2024-01-31",
      "2024-02-01",
      "2024-02-02",
    ]);
  });

  it("returns a single date when start and end are the same", () => {
    expect(datesInRange("2024-03-01", "2024-03-01")).toEqual(["2024-03-01"]);
  });
});

describe("getMonthBounds", () => {
  it("handles a 31-day month", () => {
    expect(getMonthBounds(2024, 1)).toEqual({ startDate: "2024-01-01", endDate: "2024-01-31" });
  });

  it("handles a 30-day month", () => {
    expect(getMonthBounds(2024, 4)).toEqual({ startDate: "2024-04-01", endDate: "2024-04-30" });
  });

  it("handles a 29-day month in a leap year", () => {
    expect(getMonthBounds(2024, 2)).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
  });

  it("handles a 28-day month in a non-leap year", () => {
    expect(getMonthBounds(2023, 2)).toEqual({ startDate: "2023-02-01", endDate: "2023-02-28" });
  });
});

describe("addMonths", () => {
  it("shifts forward within the same year", () => {
    expect(addMonths(2024, 3, 1)).toEqual({ year: 2024, month: 4 });
  });

  it("shifts backward within the same year", () => {
    expect(addMonths(2024, 3, -1)).toEqual({ year: 2024, month: 2 });
  });

  it("rolls over into the next year from December", () => {
    expect(addMonths(2024, 12, 1)).toEqual({ year: 2025, month: 1 });
  });

  it("rolls back into the previous year from January", () => {
    expect(addMonths(2025, 1, -1)).toEqual({ year: 2024, month: 12 });
  });

  it("handles a zero delta as a no-op", () => {
    expect(addMonths(2024, 6, 0)).toEqual({ year: 2024, month: 6 });
  });
});

describe("parseMonthParam", () => {
  const fallback = { year: 2024, month: 6 };

  it("parses a well-formed YYYY-MM param", () => {
    expect(parseMonthParam("2024-03", fallback)).toEqual({ year: 2024, month: 3 });
  });

  it("falls back when the param is undefined", () => {
    expect(parseMonthParam(undefined, fallback)).toEqual(fallback);
  });

  it("falls back when the param is malformed", () => {
    expect(parseMonthParam("not-a-month", fallback)).toEqual(fallback);
  });

  it("falls back when the month component is out of range", () => {
    expect(parseMonthParam("2024-13", fallback)).toEqual(fallback);
    expect(parseMonthParam("2024-00", fallback)).toEqual(fallback);
  });
});

describe("formatMonthLabel", () => {
  it("formats a month and year", () => {
    expect(formatMonthLabel(2026, 6)).toBe("June 2026");
  });

  it("formats December correctly", () => {
    expect(formatMonthLabel(2024, 12)).toBe("December 2024");
  });
});

describe("formatDateLabel", () => {
  it("formats a full date", () => {
    expect(formatDateLabel("2026-06-14")).toBe("June 14, 2026");
  });

  it("formats the first day of a month correctly", () => {
    expect(formatDateLabel("2024-12-01")).toBe("December 1, 2024");
  });

  it("formats the last day of a month correctly", () => {
    expect(formatDateLabel("2024-01-31")).toBe("January 31, 2024");
  });
});

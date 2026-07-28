import { describe, expect, it } from "vitest";
import {
  type CyclePattern,
  type PillType,
  addMonths,
  computeActiveType,
  computeWrappedType,
  datesInRange,
  formatDateLabel,
  formatMonthLabel,
  getGridColumnCount,
  getGridPosition,
  getMonthBounds,
  parseMonthParam,
  resolveDay,
} from "./cycle";

const typeA: PillType = { id: "type-a", name: "Type A", color: "red", days: 10 };
const typeB: PillType = { id: "type-b", name: "Type B", color: "blue", days: 12 };

// Two types (10 + 12 = 22 "on" days), 4 days off — cycle length 26, starting 2024-01-20.
// Type A: cycle-day 0-9 (2024-01-20 .. 2024-01-29)
// Type B: cycle-day 10-21 (2024-01-30 .. 2024-02-10)
// Off: cycle-day 22-25 (2024-02-11 .. 2024-02-14)
// Wraps back to Type A at 2024-02-15 (cycle-day 0 of the next cycle).
const pattern: CyclePattern = {
  cycleStartDate: "2024-01-20",
  types: [typeA, typeB],
  daysOff: 4,
};

describe("computeActiveType", () => {
  it("is type A on the first day of the cycle", () => {
    expect(computeActiveType(pattern, "2024-01-20")).toEqual(typeA);
  });

  it("is type A on its last day", () => {
    expect(computeActiveType(pattern, "2024-01-29")).toEqual(typeA);
  });

  it("transitions to type B the day after type A ends", () => {
    expect(computeActiveType(pattern, "2024-01-30")).toEqual(typeB);
  });

  it("is type B on its last day", () => {
    expect(computeActiveType(pattern, "2024-02-10")).toEqual(typeB);
  });

  it("is off on the first off-day", () => {
    expect(computeActiveType(pattern, "2024-02-11")).toBeNull();
  });

  it("is off on the last off-day", () => {
    expect(computeActiveType(pattern, "2024-02-14")).toBeNull();
  });

  it("wraps back to type A across the month boundary", () => {
    expect(computeActiveType(pattern, "2024-02-15")).toEqual(typeA);
  });

  it("resolves dates before cycleStartDate using the same periodic pattern", () => {
    // 5 days before start = cycle-day 21 of the implied previous cycle → type B.
    expect(computeActiveType(pattern, "2024-01-15")).toEqual(typeB);
    // 3 days before start = cycle-day 23 of the implied previous cycle → off.
    expect(computeActiveType(pattern, "2024-01-17")).toBeNull();
  });

  it("supports zero days off — wraps straight back to the first type", () => {
    const noOffPattern: CyclePattern = {
      cycleStartDate: "2024-01-01",
      types: [{ id: "solo", name: null, color: "green", days: 5 }],
      daysOff: 0,
    };
    expect(computeActiveType(noOffPattern, "2024-01-05")).toEqual(noOffPattern.types[0]);
    expect(computeActiveType(noOffPattern, "2024-01-06")).toEqual(noOffPattern.types[0]);
  });

  it("behaves like a single flat on/off pattern when there's only one type", () => {
    const singleType: PillType = { id: "solo", name: null, color: "yellow", days: 22 };
    const singleTypePattern: CyclePattern = {
      cycleStartDate: "2024-01-20",
      types: [singleType],
      daysOff: 4,
    };
    expect(computeActiveType(singleTypePattern, "2024-01-20")).toEqual(singleType);
    expect(computeActiveType(singleTypePattern, "2024-02-10")).toEqual(singleType);
    expect(computeActiveType(singleTypePattern, "2024-02-11")).toBeNull();
    expect(computeActiveType(singleTypePattern, "2024-02-14")).toBeNull();
    expect(computeActiveType(singleTypePattern, "2024-02-15")).toEqual(singleType);
  });
});

describe("computeWrappedType", () => {
  it("wraps within the on-rotation only, ignoring daysOff, for a normally-off day", () => {
    // 2024-02-11 is the first off-day (cycle-day 22); wrapped within the 22-day on-rotation
    // that's cycle-day 0 again → type A.
    expect(computeWrappedType(pattern, "2024-02-11")).toEqual(typeA);
    // 2024-02-14 is the last off-day (cycle-day 25); wrapped that's on-rotation day 3 → type A.
    expect(computeWrappedType(pattern, "2024-02-14")).toEqual(typeA);
  });

  it("matches computeActiveType for a genuinely on day", () => {
    expect(computeWrappedType(pattern, "2024-01-30")).toEqual(typeB);
  });
});

describe("resolveDay", () => {
  it("uses the computed value when there is no override", () => {
    expect(resolveDay(pattern, "2024-01-20", undefined)).toEqual({ isOn: true, type: typeA });
    expect(resolveDay(pattern, "2024-02-11", undefined)).toEqual({ isOn: false, type: null });
  });

  it("lets an override flip a computed on-day to off", () => {
    expect(resolveDay(pattern, "2024-01-20", { isOn: false })).toEqual({ isOn: false, type: null });
  });

  it("lets an override flip a computed off-day to on, picking the wrapped type", () => {
    expect(resolveDay(pattern, "2024-02-11", { isOn: true })).toEqual({ isOn: true, type: typeA });
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

// Fixtures below are all derived from the well-known fact that 2024 started on a Monday, by
// adding each month's day-count mod 7 — not from memory of specific real-world dates. This lets
// every weekday-start case be cross-checked from one anchor instead of independent recollections.
//
// Jan 1 2024 = Monday.  Jan(31) -> Feb 1 = Mon+3 = Thu.  Feb(29) -> Mar 1 = Thu+1 = Fri.
// Mar(31) -> Apr 1 = Fri+3 = Mon.  Apr(30) -> May 1 = Mon+2 = Wed.  May(31) -> Jun 1 = Wed+3 = Sat.
// Jun(30) -> Jul 1 = Sat+2 = Mon.  Jul(31) -> Aug 1 = Mon+3 = Thu.  Aug(31) -> Sep 1 = Thu+3 = Sun.
// Sep(30) -> Oct 1 = Sun+2 = Tue.  Oct(31) -> Nov 1 = Tue+3 = Fri.  Nov(30) -> Dec 1 = Fri+2 = Sun.
describe("getGridPosition", () => {
  it("places the 1st of a Monday-starting month at row 0, column 0", () => {
    // January 2024 starts on a Monday.
    expect(getGridPosition("2024-01-01")).toEqual({ row: 0, column: 0 });
  });

  it("places the last day of the first week at row 6 (Sunday), column 0", () => {
    expect(getGridPosition("2024-01-07")).toEqual({ row: 6, column: 0 });
  });

  it("wraps to row 0, column 1 for the first day of the second week", () => {
    expect(getGridPosition("2024-01-08")).toEqual({ row: 0, column: 1 });
  });

  it("handles a month starting mid-week (Friday)", () => {
    // March 2024 starts on a Friday (row 4).
    expect(getGridPosition("2024-03-01")).toEqual({ row: 4, column: 0 });
    // The following Monday (March 4) begins the second column.
    expect(getGridPosition("2024-03-04")).toEqual({ row: 0, column: 1 });
  });

  it("handles a month starting on Sunday", () => {
    // September 2024 starts on a Sunday (row 6).
    expect(getGridPosition("2024-09-01")).toEqual({ row: 6, column: 0 });
    expect(getGridPosition("2024-09-02")).toEqual({ row: 0, column: 1 });
  });
});

describe("getGridColumnCount", () => {
  it("needs 5 columns for a 31-day month starting on Monday", () => {
    // January 2024: Monday start, 31 days.
    expect(getGridColumnCount(2024, 1)).toBe(5);
  });

  it("needs 4 columns for a 28-day month starting exactly on Monday", () => {
    // February 2021: Monday start (non-leap, 28 days) — the minimal case.
    expect(getGridColumnCount(2021, 2)).toBe(4);
  });

  it("needs 6 columns for a 30-day month starting on Sunday", () => {
    // September 2024: Sunday start, 30 days.
    expect(getGridColumnCount(2024, 9)).toBe(6);
  });

  it("needs 6 columns for a 31-day month starting on Sunday", () => {
    // December 2024: Sunday start, 31 days.
    expect(getGridColumnCount(2024, 12)).toBe(6);
  });

  it("covers every weekday start (Tue/Wed/Thu/Sat) at 5 columns for a typical month", () => {
    expect(getGridColumnCount(2024, 10)).toBe(5); // October: Tuesday start, 31 days.
    expect(getGridColumnCount(2024, 5)).toBe(5); // May: Wednesday start, 31 days.
    expect(getGridColumnCount(2024, 2)).toBe(5); // February: Thursday start, 29 days (leap).
    expect(getGridColumnCount(2024, 6)).toBe(5); // June: Saturday start, 30 days.
  });
});

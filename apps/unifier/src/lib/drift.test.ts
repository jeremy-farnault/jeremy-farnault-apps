import { describe, expect, it } from "vitest";
import { MAX_DRIFT_DAYS, driftDays, formatAgo, formatDrift, lastTouchAt } from "./drift";

// A fixed "now" so these never depend on the wall clock.
const NOW = new Date(2026, 2, 15, 14, 30); // 15 Mar 2026, 14:30 local
const daysBefore = (n: number, hour = 9) => new Date(2026, 2, 15 - n, hour, 0);

describe("driftDays", () => {
  it("treats a person with no touches as maximally drifted", () => {
    expect(driftDays(null, NOW)).toBe(MAX_DRIFT_DAYS);
  });

  it("counts calendar days, not 24h periods", () => {
    // 11pm yesterday is 15.5h ago but is still *yesterday*.
    expect(driftDays(new Date(2026, 2, 14, 23, 0), NOW)).toBe(1);
    // 1am today is 13.5h ago and is today.
    expect(driftDays(new Date(2026, 2, 15, 1, 0), NOW)).toBe(0);
  });

  it("never returns a negative drift for a touch later today", () => {
    expect(driftDays(new Date(2026, 2, 15, 23, 0), NOW)).toBe(0);
  });

  it("counts across month boundaries", () => {
    expect(driftDays(new Date(2026, 1, 15, 9, 0), NOW)).toBe(28); // Feb 2026, 28 days
  });
});

describe("formatDrift", () => {
  it("names the never-touched case rather than rendering blank", () => {
    expect(formatDrift(null, NOW)).toBe("Never in touch");
  });

  it.each([
    [0, "Today"],
    [1, "Yesterday"],
    [2, "2 days ago"],
    [6, "6 days ago"],
    [7, "1 week ago"],
    [21, "3 weeks ago"],
    [29, "4 weeks ago"],
    [30, "1 month ago"],
    [90, "3 months ago"],
    [364, "12 months ago"],
    [365, "1 year ago"],
    [800, "2 years ago"],
  ])("renders %i days as %s", (days, expected) => {
    expect(formatDrift(daysBefore(days), NOW)).toBe(expected);
  });

  it("switches from days to weeks at exactly 7", () => {
    expect(formatDrift(daysBefore(6), NOW)).toBe("6 days ago");
    expect(formatDrift(daysBefore(7), NOW)).toBe("1 week ago");
  });
});

describe("lastTouchAt", () => {
  it("is null with no touches, so drift falls through to maximal", () => {
    expect(lastTouchAt([])).toBeNull();
    expect(formatDrift(lastTouchAt([]), NOW)).toBe("Never in touch");
  });

  it("picks the most recent regardless of list order", () => {
    const touches = [
      { occurredAt: new Date(2026, 2, 1) },
      { occurredAt: new Date(2026, 2, 12) },
      { occurredAt: new Date(2026, 1, 20) },
    ];
    expect(lastTouchAt(touches)).toEqual(new Date(2026, 2, 12));
  });
});

describe("formatAgo", () => {
  it("shares its thresholds with formatDrift", () => {
    expect(formatAgo(daysBefore(21), NOW)).toBe("3 weeks ago");
    expect(formatAgo(daysBefore(0), NOW)).toBe("Today");
  });

  it("is what the critical flag's age is rendered with", () => {
    // A flag set 10 days ago reads the same way a 10-day drift would.
    expect(formatAgo(daysBefore(10), NOW)).toBe("1 week ago");
  });
});

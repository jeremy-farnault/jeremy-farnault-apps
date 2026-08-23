import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./workouts-query", () => ({
  getWorkoutsInRange: vi.fn(),
}));

import { executeGetWorkoutsInRange, parseWorkoutsDateRangeArgs } from "./tools";
import { getWorkoutsInRange } from "./workouts-query";

const mockedGetWorkoutsInRange = vi.mocked(getWorkoutsInRange);

describe("parseWorkoutsDateRangeArgs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses a valid ISO range", () => {
    const result = parseWorkoutsDateRangeArgs({ start_date: "2026-08-17", end_date: "2026-08-23" });
    expect(result).toEqual({
      startDate: new Date("2026-08-17"),
      endDate: new Date("2026-08-23"),
    });
  });

  it("swaps start and end when reversed", () => {
    const result = parseWorkoutsDateRangeArgs({ start_date: "2026-08-23", end_date: "2026-08-17" });
    expect(result).toEqual({
      startDate: new Date("2026-08-17"),
      endDate: new Date("2026-08-23"),
    });
  });

  it("returns null when fields are missing or not strings", () => {
    expect(parseWorkoutsDateRangeArgs({ start_date: "2026-08-17" })).toBeNull();
    expect(parseWorkoutsDateRangeArgs({})).toBeNull();
    expect(parseWorkoutsDateRangeArgs(null)).toBeNull();
  });

  it("returns null for unparseable date strings", () => {
    expect(
      parseWorkoutsDateRangeArgs({ start_date: "not-a-date", end_date: "2026-08-23" })
    ).toBeNull();
  });

  it("clamps end_date to now when it's in the future", () => {
    const result = parseWorkoutsDateRangeArgs({
      start_date: "2026-08-01",
      end_date: "2027-01-01",
    });
    expect(result?.endDate).toEqual(new Date("2026-08-23T00:00:00.000Z"));
  });

  it("clamps the range to MAX_RANGE_DAYS from the end", () => {
    const result = parseWorkoutsDateRangeArgs({
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

describe("executeGetWorkoutsInRange", () => {
  beforeEach(() => {
    mockedGetWorkoutsInRange.mockReset();
  });

  it("returns an error payload without calling the DB for invalid args", async () => {
    const result = await executeGetWorkoutsInRange("user-1", { start_date: "nope" });
    expect(JSON.parse(result)).toEqual({ error: "invalid_date_range" });
    expect(mockedGetWorkoutsInRange).not.toHaveBeenCalled();
  });

  it("accepts JSON-encoded string arguments", async () => {
    mockedGetWorkoutsInRange.mockResolvedValue([]);
    await executeGetWorkoutsInRange(
      "user-1",
      '{"start_date":"2026-08-17","end_date":"2026-08-23"}'
    );
    expect(mockedGetWorkoutsInRange).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-08-17"),
      new Date("2026-08-23")
    );
  });

  it("returns count and sessions on success", async () => {
    mockedGetWorkoutsInRange.mockResolvedValue([
      {
        name: "Push Day",
        startedAt: new Date("2026-08-18T10:00:00Z"),
        finishedAt: new Date("2026-08-18T11:00:00Z"),
      },
    ]);

    const result = await executeGetWorkoutsInRange("user-1", {
      start_date: "2026-08-17",
      end_date: "2026-08-23",
    });

    expect(JSON.parse(result)).toEqual({
      count: 1,
      sessions: [
        {
          name: "Push Day",
          started_at: "2026-08-18T10:00:00.000Z",
          finished_at: "2026-08-18T11:00:00.000Z",
        },
      ],
    });
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetWorkoutsInRange.mockRejectedValue(new Error("connection refused"));

    const result = await executeGetWorkoutsInRange("user-1", {
      start_date: "2026-08-17",
      end_date: "2026-08-23",
    });

    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

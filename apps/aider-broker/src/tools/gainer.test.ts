import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./gainer-query", () => ({
  getWorkoutsInRange: vi.fn(),
  getExercisesOnDay: vi.fn(),
}));

import {
  executeGetExercisesOnDay,
  executeGetWorkoutsInRange,
  parseExerciseDayArgs,
} from "./gainer";
import { getExercisesOnDay, getWorkoutsInRange } from "./gainer-query";

const mockedGetWorkoutsInRange = vi.mocked(getWorkoutsInRange);
const mockedGetExercisesOnDay = vi.mocked(getExercisesOnDay);

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

  it("returns the resolved range, count and sessions on success", async () => {
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
      range: { start_date: "2026-08-17", end_date: "2026-08-23" },
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

// "Now" is Wednesday 2026-08-26 (Monday of that week is the 24th).
describe("parseExerciseDayArgs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const dayOnly = (d: Date) => d.toISOString().slice(0, 10);

  it("resolves an explicit ISO date to that UTC day window", () => {
    const window = parseExerciseDayArgs({ date: "2026-08-18" });
    expect(window).not.toBeNull();
    expect(dayOnly((window as { startDate: Date }).startDate)).toBe("2026-08-18");
    expect((window as { endDate: Date }).endDate.toISOString()).toBe("2026-08-18T23:59:59.999Z");
  });

  it("resolves 'yesterday' relative to now", () => {
    const window = parseExerciseDayArgs({ day: "yesterday" });
    expect(dayOnly((window as { startDate: Date }).startDate)).toBe("2026-08-25");
  });

  it("resolves 'last_tuesday' to the prior week's Tuesday", () => {
    const window = parseExerciseDayArgs({ day: "last_tuesday" });
    expect(dayOnly((window as { startDate: Date }).startDate)).toBe("2026-08-18");
  });

  it("resolves 'this_monday' to the current week's Monday", () => {
    const window = parseExerciseDayArgs({ day: "this_monday" });
    expect(dayOnly((window as { startDate: Date }).startDate)).toBe("2026-08-24");
  });

  it("returns null for missing or invalid day args", () => {
    expect(parseExerciseDayArgs({})).toBeNull();
    expect(parseExerciseDayArgs({ day: "someday" })).toBeNull();
    expect(parseExerciseDayArgs({ date: "not-a-date" })).toBeNull();
  });
});

describe("executeGetExercisesOnDay", () => {
  beforeEach(() => {
    mockedGetExercisesOnDay.mockReset();
  });

  it("returns an error payload without calling the DB for invalid args", async () => {
    const result = await executeGetExercisesOnDay("user-1", { day: "nope" });
    expect(JSON.parse(result)).toEqual({ error: "invalid_day" });
    expect(mockedGetExercisesOnDay).not.toHaveBeenCalled();
  });

  it("returns the day and per-session exercises on success", async () => {
    mockedGetExercisesOnDay.mockResolvedValue([
      {
        name: "Push Day",
        startedAt: new Date("2026-08-18T10:00:00Z"),
        exercises: [
          { name: "Bench Press", type: "standard", setCount: 3 },
          { name: "Overhead Press", type: "standard", setCount: 4 },
        ],
      },
    ]);

    const result = await executeGetExercisesOnDay("user-1", { date: "2026-08-18" });

    expect(mockedGetExercisesOnDay).toHaveBeenCalledWith(
      "user-1",
      new Date("2026-08-18T00:00:00.000Z"),
      new Date("2026-08-18T23:59:59.999Z")
    );
    expect(JSON.parse(result)).toEqual({
      date: "2026-08-18",
      sessions: [
        {
          name: "Push Day",
          exercises: [
            { name: "Bench Press", type: "standard", set_count: 3 },
            { name: "Overhead Press", type: "standard", set_count: 4 },
          ],
        },
      ],
    });
  });

  it("caps the exercises returned per session at 50", async () => {
    const manyExercises = Array.from({ length: 60 }, (_, i) => ({
      name: `Exercise ${i}`,
      type: "standard",
      setCount: 1,
    }));
    mockedGetExercisesOnDay.mockResolvedValue([
      { name: "Marathon", startedAt: new Date("2026-08-18T10:00:00Z"), exercises: manyExercises },
    ]);

    const result = await executeGetExercisesOnDay("user-1", { date: "2026-08-18" });
    const parsed = JSON.parse(result);
    expect(parsed.sessions[0].exercises).toHaveLength(50);
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetExercisesOnDay.mockRejectedValue(new Error("db down"));
    const result = await executeGetExercisesOnDay("user-1", { date: "2026-08-18" });
    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

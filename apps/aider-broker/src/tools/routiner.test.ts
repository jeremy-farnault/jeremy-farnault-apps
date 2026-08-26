import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./routiner-query", () => ({
  getHabitLogsInRange: vi.fn(),
  listHabitNames: vi.fn(),
}));

import { executeGetHabitLogCount } from "./routiner";
import { getHabitLogsInRange, listHabitNames } from "./routiner-query";

const mockedGetHabitLogsInRange = vi.mocked(getHabitLogsInRange);
const mockedListHabitNames = vi.mocked(listHabitNames);

describe("executeGetHabitLogCount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    mockedGetHabitLogsInRange.mockReset();
    mockedListHabitNames.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns invalid_arguments when the habit is missing", async () => {
    const result = await executeGetHabitLogCount("user-1", {
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });
    expect(JSON.parse(result)).toEqual({ error: "invalid_arguments" });
    expect(mockedGetHabitLogsInRange).not.toHaveBeenCalled();
  });

  it("returns invalid_date_range when no range is provided", async () => {
    const result = await executeGetHabitLogCount("user-1", { habit: "meditation" });
    expect(JSON.parse(result)).toEqual({ error: "invalid_date_range" });
    expect(mockedGetHabitLogsInRange).not.toHaveBeenCalled();
  });

  it("counts only 'true' days for boolean habits", async () => {
    mockedGetHabitLogsInRange.mockResolvedValue({
      name: "Meditation",
      type: "boolean",
      logs: [
        { date: "2026-08-02", value: "true" },
        { date: "2026-08-03", value: "false" },
        { date: "2026-08-05", value: "true" },
      ],
    });

    const result = await executeGetHabitLogCount("user-1", {
      habit: "meditation",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });

    expect(mockedGetHabitLogsInRange).toHaveBeenCalledWith(
      "user-1",
      "meditation",
      "2026-08-01",
      "2026-08-31"
    );
    expect(JSON.parse(result)).toEqual({
      range: { start_date: "2026-08-01", end_date: "2026-08-31" },
      habit: "Meditation",
      type: "boolean",
      count: 2,
      logs: [
        { date: "2026-08-02", value: "true" },
        { date: "2026-08-03", value: "false" },
        { date: "2026-08-05", value: "true" },
      ],
    });
  });

  it("counts row existence for numeric habits", async () => {
    mockedGetHabitLogsInRange.mockResolvedValue({
      name: "Pushups",
      type: "numeric",
      logs: [
        { date: "2026-08-02", value: "20" },
        { date: "2026-08-03", value: "0" },
      ],
    });

    const result = await executeGetHabitLogCount("user-1", {
      habit: "pushups",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });

    expect(JSON.parse(result)).toMatchObject({ type: "numeric", count: 2 });
  });

  it("caps the returned logs at 100 while counting the full set", async () => {
    const logs = Array.from({ length: 130 }, (_, i) => ({
      date: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
      value: "true",
    }));
    mockedGetHabitLogsInRange.mockResolvedValue({ name: "Water", type: "boolean", logs });

    const result = await executeGetHabitLogCount("user-1", {
      habit: "water",
      start_date: "2026-01-01",
      end_date: "2026-08-31",
    });
    const parsed = JSON.parse(result);
    expect(parsed.count).toBe(130);
    expect(parsed.logs).toHaveLength(100);
  });

  it("returns no_matching_habit with available names when nothing matches", async () => {
    mockedGetHabitLogsInRange.mockResolvedValue(null);
    mockedListHabitNames.mockResolvedValue(["Meditation", "Reading"]);

    const result = await executeGetHabitLogCount("user-1", {
      habit: "yoga",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });

    expect(JSON.parse(result)).toEqual({
      error: "no_matching_habit",
      available: ["Meditation", "Reading"],
    });
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetHabitLogsInRange.mockRejectedValue(new Error("db down"));
    const result = await executeGetHabitLogCount("user-1", {
      habit: "meditation",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });
    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./journaler-query", () => ({
  getMediaInRange: vi.fn(),
}));

import { executeGetMediaInRange } from "./journaler";
import { getMediaInRange } from "./journaler-query";

const mockedGetMediaInRange = vi.mocked(getMediaInRange);

describe("executeGetMediaInRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));
    mockedGetMediaInRange.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an error payload without calling the DB for invalid args", async () => {
    const result = await executeGetMediaInRange("user-1", {});
    expect(JSON.parse(result)).toEqual({ error: "invalid_date_range" });
    expect(mockedGetMediaInRange).not.toHaveBeenCalled();
  });

  it("queries the resolved range with the row cap and shapes the result", async () => {
    mockedGetMediaInRange.mockResolvedValue([
      { title: "Dune", category: "Movie", rating: 9, date: "2026-08-04" },
      { title: "Foundation", category: "TV Show", rating: null, date: "2026-08-20" },
    ]);

    const result = await executeGetMediaInRange("user-1", {
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });

    // The 50-item cap is enforced by the query's LIMIT, no category filter passed.
    expect(mockedGetMediaInRange).toHaveBeenCalledWith(
      "user-1",
      "2026-08-01",
      "2026-08-31",
      50,
      undefined
    );
    expect(JSON.parse(result)).toEqual({
      range: { start_date: "2026-08-01", end_date: "2026-08-31" },
      count: 2,
      entries: [
        { title: "Dune", category: "Movie", rating: 9, date: "2026-08-04" },
        { title: "Foundation", category: "TV Show", rating: null, date: "2026-08-20" },
      ],
    });
  });

  it("passes a valid category filter and echoes it back", async () => {
    mockedGetMediaInRange.mockResolvedValue([]);

    const result = await executeGetMediaInRange("user-1", {
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      category: "Movie",
    });

    expect(mockedGetMediaInRange).toHaveBeenCalledWith(
      "user-1",
      "2026-08-01",
      "2026-08-31",
      50,
      "Movie"
    );
    expect(JSON.parse(result)).toMatchObject({ category: "Movie", count: 0 });
  });

  it("ignores an unrecognized category (no filter, no echo)", async () => {
    mockedGetMediaInRange.mockResolvedValue([]);

    const result = await executeGetMediaInRange("user-1", {
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      category: "Podcast",
    });

    expect(mockedGetMediaInRange).toHaveBeenCalledWith(
      "user-1",
      "2026-08-01",
      "2026-08-31",
      50,
      undefined
    );
    expect(JSON.parse(result)).not.toHaveProperty("category");
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetMediaInRange.mockRejectedValue(new Error("db down"));
    const result = await executeGetMediaInRange("user-1", {
      start_date: "2026-08-01",
      end_date: "2026-08-31",
    });
    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

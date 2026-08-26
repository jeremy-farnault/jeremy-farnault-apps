import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockOrderBy, mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockOrderBy, mockWhere, mockFrom, mockSelect };
});

vi.mock("@jf/db", () => ({
  db: { select: mockSelect },
  gainerSessions: {
    userId: "gainer_sessions.user_id",
    name: "gainer_sessions.name",
    startedAt: "gainer_sessions.started_at",
    finishedAt: "gainer_sessions.finished_at",
  },
}));

import { getWorkoutsInRange } from "./gainer-query";

describe("getWorkoutsInRange", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhere.mockClear();
    mockOrderBy.mockReset();
  });

  it("queries via select/from/where/orderBy and maps rows", async () => {
    const startedAt = new Date("2026-08-18T10:00:00Z");
    const finishedAt = new Date("2026-08-18T11:00:00Z");
    mockOrderBy.mockResolvedValue([{ name: "Push Day", startedAt, finishedAt }]);

    const result = await getWorkoutsInRange(
      "user-1",
      new Date("2026-08-17"),
      new Date("2026-08-23")
    );

    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockOrderBy).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ name: "Push Day", startedAt, finishedAt }]);
  });

  it("returns an empty array when there are no matching sessions", async () => {
    mockOrderBy.mockResolvedValue([]);

    const result = await getWorkoutsInRange(
      "user-1",
      new Date("2026-08-17"),
      new Date("2026-08-23")
    );

    expect(result).toEqual([]);
  });
});

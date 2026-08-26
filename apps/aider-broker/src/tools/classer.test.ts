import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./classer-query", () => ({
  getTopItemsInList: vi.fn(),
  listClasserNames: vi.fn(),
}));

import { executeGetTopItemsInList, parseTopItemsArgs } from "./classer";
import { getTopItemsInList, listClasserNames } from "./classer-query";

const mockedGetTopItemsInList = vi.mocked(getTopItemsInList);
const mockedListClasserNames = vi.mocked(listClasserNames);

describe("parseTopItemsArgs", () => {
  it("defaults the limit to 5 when absent", () => {
    expect(parseTopItemsArgs({ list: "liquors" })).toEqual({ list: "liquors", limit: 5 });
  });

  it("caps the limit at 20", () => {
    expect(parseTopItemsArgs({ list: "liquors", limit: 999 })).toEqual({
      list: "liquors",
      limit: 20,
    });
  });

  it("floors and keeps a valid limit, trims the list name", () => {
    expect(parseTopItemsArgs({ list: "  movies ", limit: 3.9 })).toEqual({
      list: "movies",
      limit: 3,
    });
  });

  it("returns null when the list is missing or empty", () => {
    expect(parseTopItemsArgs({})).toBeNull();
    expect(parseTopItemsArgs({ list: "   " })).toBeNull();
    expect(parseTopItemsArgs(null)).toBeNull();
  });
});

describe("executeGetTopItemsInList", () => {
  beforeEach(() => {
    mockedGetTopItemsInList.mockReset();
    mockedListClasserNames.mockReset();
  });

  it("returns an error payload without calling the DB for invalid args", async () => {
    const result = await executeGetTopItemsInList("user-1", {});
    expect(JSON.parse(result)).toEqual({ error: "invalid_arguments" });
    expect(mockedGetTopItemsInList).not.toHaveBeenCalled();
  });

  it("passes the clamped limit to the query and shapes the result", async () => {
    mockedGetTopItemsInList.mockResolvedValue({
      listName: "Liquors",
      items: [
        { rank: 1, name: "Whisky", description: "Peaty" },
        { rank: 2, name: "Rum", description: null },
      ],
    });

    const result = await executeGetTopItemsInList("user-1", { list: "liquors", limit: 999 });

    expect(mockedGetTopItemsInList).toHaveBeenCalledWith("user-1", "liquors", 20);
    expect(JSON.parse(result)).toEqual({
      list: "Liquors",
      count: 2,
      items: [
        { rank: 1, name: "Whisky", description: "Peaty" },
        { rank: 2, name: "Rum", description: null },
      ],
    });
  });

  it("returns a no_matching_list error with available names when nothing matches", async () => {
    mockedGetTopItemsInList.mockResolvedValue(null);
    mockedListClasserNames.mockResolvedValue(["Movies", "Restaurants"]);

    const result = await executeGetTopItemsInList("user-1", { list: "liquors" });

    expect(JSON.parse(result)).toEqual({
      error: "no_matching_list",
      available: ["Movies", "Restaurants"],
    });
  });

  it("returns an error payload instead of throwing when the DB lookup fails", async () => {
    mockedGetTopItemsInList.mockRejectedValue(new Error("db down"));
    const result = await executeGetTopItemsInList("user-1", { list: "liquors" });
    expect(JSON.parse(result)).toEqual({ error: "lookup_failed" });
  });
});

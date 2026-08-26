import { describe, expect, it } from "vitest";

import { AVAILABLE_TOOLS, selectToolsForMessage } from "./index";

const names = (message: string) => selectToolsForMessage(message).map((tool) => tool.function.name);

describe("selectToolsForMessage", () => {
  it("offers both Gainer tools for a training question", () => {
    expect(names("how many times did I train last week")).toEqual([
      "get_workouts_in_range",
      "get_exercises_on_day",
    ]);
  });

  it("offers only the Financer tool for an assets question", () => {
    expect(names("what is the value of my current assets")).toEqual(["get_current_assets"]);
  });

  it("offers only the Journaler tool for a media question", () => {
    expect(names("which movies did I watch this month")).toEqual(["get_media_in_range"]);
  });

  it("offers only the Routiner tool for a habit question", () => {
    expect(names("how consistent was I with my meditation habit")).toEqual(["get_habit_log_count"]);
  });

  it("offers only the Classer tool for a ranking question", () => {
    expect(names("what are my top 3 liquors")).toEqual(["get_top_items_in_list"]);
  });

  it("falls back to every tool for a non-data question", () => {
    expect(names("why is the sky blue")).toEqual(AVAILABLE_TOOLS.map((tool) => tool.function.name));
  });
});

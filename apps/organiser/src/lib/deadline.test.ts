import { describe, expect, it } from "vitest";

import { formatDeadline } from "./deadline";

describe("formatDeadline", () => {
  it("formats day then short month, the same everywhere", () => {
    expect(formatDeadline("2026-11-06")).toBe("6 Nov");
    expect(formatDeadline("2027-01-31")).toBe("31 Jan");
  });

  it("doesn't shift the day with the runtime's timezone", () => {
    // Run with TZ=America/Los_Angeles or TZ=Pacific/Auckland: still the same calendar day.
    expect(formatDeadline("2026-03-01")).toBe("1 Mar");
  });
});

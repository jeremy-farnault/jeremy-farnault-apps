import { describe, expect, it } from "vitest";

describe("testing package setup", () => {
  it("should be configured correctly", () => {
    expect(true).toBe(true);
  });

  it("should support basic assertions", () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });
});

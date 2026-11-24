import { describe, expect, it } from "vitest";

import { parseQuickEntry } from "./quick-entry";

const categories = [
  "Entertainment",
  "Everyday",
  "Groceries",
  "Health",
  "Housing",
  "Presents & Hobbies",
  "Public transport",
  "Clothing",
];

describe("parseQuickEntry", () => {
  it("reads an amount and a category prefix", () => {
    expect(parseQuickEntry("45 gr", categories)).toEqual({
      ok: true,
      row: { value: "45", category: "Groceries" },
    });
  });

  it("takes a decimal comma or a decimal point", () => {
    expect(parseQuickEntry("45,50 gr", categories)).toEqual({
      ok: true,
      row: { value: "45.50", category: "Groceries" },
    });
    expect(parseQuickEntry("45.50 gr", categories)).toEqual({
      ok: true,
      row: { value: "45.50", category: "Groceries" },
    });
  });

  it("matches the start of a later word in a category's name", () => {
    expect(parseQuickEntry("120 tr", categories)).toMatchObject({
      row: { category: "Public transport" },
    });
  });

  it("matches a prefix of several words against the whole name", () => {
    expect(parseQuickEntry("120 public tr", categories)).toMatchObject({
      row: { category: "Public transport" },
    });
  });

  it("ignores letter case", () => {
    expect(parseQuickEntry("45 GR", categories)).toMatchObject({ row: { category: "Groceries" } });
    expect(parseQuickEntry("45 Gr", categories)).toMatchObject({ row: { category: "Groceries" } });
  });

  it("picks the first match alphabetically when a prefix is ambiguous", () => {
    // "e" starts Entertainment and Everyday; "ho" starts Housing and the word Hobbies.
    expect(parseQuickEntry("10 e", categories)).toMatchObject({
      row: { category: "Entertainment" },
    });
    expect(parseQuickEntry("10 ho", categories)).toMatchObject({ row: { category: "Housing" } });
  });

  it("matches custom categories like the built-in ones", () => {
    expect(parseQuickEntry("30 dog", [...categories, "Dog food"])).toMatchObject({
      row: { category: "Dog food" },
    });
  });

  it("ignores extra spaces around and between the parts", () => {
    expect(parseQuickEntry("  45   gr  ", categories)).toMatchObject({
      row: { value: "45", category: "Groceries" },
    });
  });

  it("returns nothing for a blank line", () => {
    expect(parseQuickEntry("   ", categories)).toBeNull();
  });

  it("refuses a line that doesn't start with an amount", () => {
    expect(parseQuickEntry("gr 45", categories)).toEqual({
      ok: false,
      error: "'gr' isn't an amount",
    });
    expect(parseQuickEntry("1 250 gr", categories)).toMatchObject({ ok: false });
  });

  it("refuses an amount that isn't positive", () => {
    expect(parseQuickEntry("0 gr", categories)).toEqual({
      ok: false,
      error: "Enter a positive amount",
    });
  });

  it("refuses an amount with no category", () => {
    expect(parseQuickEntry("45", categories)).toEqual({
      ok: false,
      error: "Type the start of a category",
    });
  });

  it("refuses a prefix that matches no category, naming it", () => {
    expect(parseQuickEntry("45 xyz", categories)).toEqual({
      ok: false,
      error: "No category matches 'xyz'",
    });
  });
});

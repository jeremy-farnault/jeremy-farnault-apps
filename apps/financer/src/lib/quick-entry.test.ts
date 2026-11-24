import { describe, expect, it } from "vitest";

import { categoryTotals, parseQuickEntry } from "./quick-entry";

const categoryNames = [
  "Entertainment",
  "Everyday",
  "Groceries",
  "Health",
  "Housing",
  "Presents & Hobbies",
  "Public transport",
  "Clothing",
];
const context = {
  categories: categoryNames,
  currencies: ["EUR", "SEK", "USD"],
  sessionCurrency: "SEK",
};

describe("parseQuickEntry", () => {
  it("reads an amount and a category prefix", () => {
    expect(parseQuickEntry("45 gr", context)).toEqual({
      ok: true,
      row: { value: "45", category: "Groceries", currency: "SEK" },
    });
  });

  it("takes a decimal comma or a decimal point", () => {
    expect(parseQuickEntry("45,50 gr", context)).toEqual({
      ok: true,
      row: { value: "45.50", category: "Groceries", currency: "SEK" },
    });
    expect(parseQuickEntry("45.50 gr", context)).toEqual({
      ok: true,
      row: { value: "45.50", category: "Groceries", currency: "SEK" },
    });
  });

  it("matches the start of a later word in a category's name", () => {
    expect(parseQuickEntry("120 tr", context)).toMatchObject({
      row: { category: "Public transport" },
    });
  });

  it("matches a prefix of several words against the whole name", () => {
    expect(parseQuickEntry("120 public tr", context)).toMatchObject({
      row: { category: "Public transport" },
    });
  });

  it("ignores letter case", () => {
    expect(parseQuickEntry("45 GR", context)).toMatchObject({ row: { category: "Groceries" } });
    expect(parseQuickEntry("45 Gr", context)).toMatchObject({ row: { category: "Groceries" } });
  });

  it("picks the first match alphabetically when a prefix is ambiguous", () => {
    // "e" starts Entertainment and Everyday; "ho" starts Housing and the word Hobbies.
    expect(parseQuickEntry("10 e", context)).toMatchObject({
      row: { category: "Entertainment" },
    });
    expect(parseQuickEntry("10 ho", context)).toMatchObject({ row: { category: "Housing" } });
  });

  it("matches custom categories like the built-in ones", () => {
    expect(
      parseQuickEntry("30 dog", { ...context, categories: [...categoryNames, "Dog food"] })
    ).toMatchObject({
      row: { category: "Dog food" },
    });
  });

  it("ignores extra spaces around and between the parts", () => {
    expect(parseQuickEntry("  45   gr  ", context)).toMatchObject({
      row: { value: "45", category: "Groceries" },
    });
  });

  it("returns nothing for a blank line", () => {
    expect(parseQuickEntry("   ", context)).toBeNull();
  });

  it("refuses a line that doesn't start with an amount", () => {
    expect(parseQuickEntry("gr 45", context)).toEqual({
      ok: false,
      error: "'gr' isn't an amount",
    });
    expect(parseQuickEntry("1 250 gr", context)).toMatchObject({ ok: false });
  });

  it("refuses an amount that isn't positive", () => {
    expect(parseQuickEntry("0 gr", context)).toEqual({
      ok: false,
      error: "Enter a positive amount",
    });
  });

  it("refuses an amount with no category", () => {
    expect(parseQuickEntry("45", context)).toEqual({
      ok: false,
      error: "Type the start of a category",
    });
  });

  it("refuses a prefix that matches no category, naming it", () => {
    expect(parseQuickEntry("45 xyz", context)).toEqual({
      ok: false,
      error: "No category matches 'xyz'",
    });
  });

  it("takes a currency code at the end of the line", () => {
    expect(parseQuickEntry("45 gr eur", context)).toEqual({
      ok: true,
      row: { value: "45", category: "Groceries", currency: "EUR" },
    });
    expect(parseQuickEntry("45 gr EUR", context)).toMatchObject({ row: { currency: "EUR" } });
    expect(parseQuickEntry("120 public tr usd", context)).toMatchObject({
      row: { category: "Public transport", currency: "USD" },
    });
  });

  it("uses the session currency when the line names none", () => {
    expect(parseQuickEntry("45 gr", { ...context, sessionCurrency: "EUR" })).toMatchObject({
      row: { currency: "EUR" },
    });
  });

  it("reads a lone second part as a category, never a currency", () => {
    expect(parseQuickEntry("45 EUR", context)).toEqual({
      ok: false,
      error: "No category matches 'EUR'",
    });
    expect(
      parseQuickEntry("45 eur", { ...context, categories: [...categoryNames, "Euro trip"] })
    ).toMatchObject({
      row: { category: "Euro trip", currency: "SEK" },
    });
  });

  it("refuses an unknown currency code", () => {
    expect(parseQuickEntry("45 gr xyz", context)).toEqual({
      ok: false,
      error: "Unknown currency 'XYZ'",
    });
  });

  it("reads a three-letter word as part of the category when that matches", () => {
    expect(parseQuickEntry("120 public tra", context)).toMatchObject({
      row: { category: "Public transport", currency: "SEK" },
    });
  });

  it("refuses a known currency after a prefix that matches nothing", () => {
    expect(parseQuickEntry("45 xyz eur", context)).toEqual({
      ok: false,
      error: "No category matches 'xyz'",
    });
  });
});

describe("categoryTotals", () => {
  it("adds up the rows of each category", () => {
    expect(
      categoryTotals([
        { value: "45", category: "Groceries", currency: "SEK" },
        { value: "300", category: "Clothing", currency: "SEK" },
        { value: "120.50", category: "Groceries", currency: "SEK" },
        { value: "80", category: "Groceries", currency: "SEK" },
      ])
    ).toEqual([
      { category: "Clothing", currency: "SEK", total: 300 },
      { category: "Groceries", currency: "SEK", total: 245.5 },
    ]);
  });

  it("keeps currencies apart within a category", () => {
    expect(
      categoryTotals([
        { value: "45", category: "Groceries", currency: "SEK" },
        { value: "10", category: "Groceries", currency: "EUR" },
        { value: "5", category: "Groceries", currency: "EUR" },
      ])
    ).toEqual([
      { category: "Groceries", currency: "EUR", total: 15 },
      { category: "Groceries", currency: "SEK", total: 45 },
    ]);
  });

  it("leaves out rows that aren't complete", () => {
    expect(
      categoryTotals([
        { value: "45", category: "Groceries", currency: "SEK" },
        { value: "", category: "Groceries", currency: "SEK" },
        { value: "30", category: "", currency: "SEK" },
        { value: "abc", category: "Health", currency: "SEK" },
        { value: "0", category: "Health", currency: "SEK" },
      ])
    ).toEqual([{ category: "Groceries", currency: "SEK", total: 45 }]);
  });

  it("is empty with no rows", () => {
    expect(categoryTotals([])).toEqual([]);
  });
});

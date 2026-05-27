export const CURRENCIES = ["EUR", "GBP", "JPY", "NZD", "SEK", "USD"] as const;

export const ASSET_SOURCE_COLORS = [
  "var(--blue-400)",
  "var(--green-400)",
  "var(--teal-400)",
  "var(--moss-400)",
  "var(--beige-400)",
  "var(--yellow-400)",
  "var(--magenta-400)",
  "var(--red-400)",
] as const;

export const INCOME_SOURCE_COLORS = [
  "var(--purple-400)",
  "var(--teal-400)",
  "var(--yellow-400)",
  "var(--red-400)",
  "var(--blue-400)",
  "var(--green-400)",
  "var(--magenta-400)",
  "var(--moss-400)",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: "var(--purple-400)",
  Everyday: "var(--blue-400)",
  Groceries: "var(--green-400)",
  Health: "var(--teal-400)",
  Housing: "var(--moss-400)",
  "Presents & Hobbies": "var(--magenta-400)",
  Restaurant: "var(--yellow-400)",
  Transport: "var(--taupe-400)",
  Other: "var(--beige-400)",
};

export const SPENDING_CATEGORIES = [
  "Entertainment",
  "Everyday",
  "Groceries",
  "Health",
  "Housing",
  "Presents & Hobbies",
  "Restaurant",
  "Transport",
  "Other",
] as const;

import type {
  financerAssetEntries,
  financerAssetSources,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerSpendingCategories,
  financerSummaries,
  financerUserSettings,
} from "@jf/db";

import type { IsoDate } from "./dates";
import { seededRandom, stableUuid } from "./determinism";

export interface FinancerFixtures {
  settings: (typeof financerUserSettings.$inferInsert)[];
  spendingCategories: (typeof financerSpendingCategories.$inferInsert)[];
  /** Open spending entries: only the current month, as if not closed yet. */
  entries: (typeof financerEntries.$inferInsert)[];
  /** Closed spending months: one total per category and currency. */
  summaries: (typeof financerSummaries.$inferInsert)[];
  incomeSources: (typeof financerIncomeSources.$inferInsert)[];
  incomeEntries: (typeof financerIncomeEntries.$inferInsert)[];
  assetSources: (typeof financerAssetSources.$inferInsert)[];
  assetEntries: (typeof financerAssetEntries.$inferInsert)[];
}

/** How many months of history, ending with the current one (the overview shows 12). */
export const FINANCER_MONTHS = 12;

/** `YYYY-MM`, `back` months before the month of `today`. */
export function monthBefore(today: IsoDate, back: number): string {
  const [year, month] = today.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) - back;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function money(value: number): string {
  return value.toFixed(2);
}

interface CategorySpec {
  name: string;
  color: string;
  /** Monthly total in SEK, from a 0–1 roll and the calendar month (1–12). */
  monthly: (roll: number, calendarMonth: number) => number;
}

// Colours match Financer's built-in category colours.
const CATEGORIES: CategorySpec[] = [
  { name: "Housing", color: "var(--moss-400)", monthly: () => 9800 },
  { name: "Groceries", color: "var(--green-400)", monthly: (r) => 3200 + r * 1100 },
  {
    name: "Restaurant",
    color: "var(--yellow-400)",
    monthly: (r, m) => 900 + r * 900 + (m === 12 ? 900 : 0),
  },
  { name: "Transport", color: "var(--taupe-400)", monthly: (r) => 550 + r * 600 },
  { name: "Entertainment", color: "var(--purple-400)", monthly: (r) => 300 + r * 650 },
  { name: "Health", color: "var(--teal-400)", monthly: (r) => 250 + r * 450 },
  { name: "Everyday", color: "var(--blue-400)", monthly: (r) => 500 + r * 700 },
  {
    name: "Presents & Hobbies",
    color: "var(--magenta-400)",
    monthly: (r, m) => (m === 12 ? 2800 : 250) + r * 900,
  },
];

/** The summer holiday month: part of the spending happens in euros. */
const HOLIDAY_MONTH = 7;

export function buildFinancerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): FinancerFixtures {
  const id = (key: string) => stableUuid(userId, `financer:${key}`);
  const random = seededRandom(`${userId}:financer`);
  const months = Array.from({ length: FINANCER_MONTHS }, (_, i) =>
    monthBefore(today, FINANCER_MONTHS - 1 - i)
  );
  const current = months[months.length - 1] as string;

  const fixtures: FinancerFixtures = {
    settings: [{ id: id("settings"), userId, homeCurrency: "SEK" }],
    spendingCategories: CATEGORIES.map((category) => ({
      id: id(`category:${category.name}`),
      userId,
      name: category.name,
      color: category.color,
    })),
    entries: [],
    summaries: [],
    incomeSources: [],
    incomeEntries: [],
    assetSources: [],
    assetEntries: [],
  };

  // Spending: past months closed into one total per category; this month still open,
  // as a handful of entries per category.
  for (const month of months) {
    const calendarMonth = Number(month.slice(5));
    for (const category of CATEGORIES) {
      const total = category.monthly(random(), calendarMonth);
      const inEuros =
        calendarMonth === HOLIDAY_MONTH && ["Restaurant", "Transport"].includes(category.name);
      const currency = inEuros ? "EUR" : "SEK";
      // Roughly 11 SEK to the euro, so the converted total stays in the same range.
      const value = inEuros ? total / 11 : total;

      if (month !== current) {
        fixtures.summaries.push({
          id: id(`summary:${month}:${category.name}`),
          userId,
          category: category.name,
          value: money(value),
          month,
          currency,
        });
        continue;
      }

      const parts = category.name === "Housing" ? 1 : 2 + Math.floor(random() * 3);
      const weights = Array.from({ length: parts }, () => 0.5 + random());
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      weights.forEach((weight, index) => {
        fixtures.entries.push({
          id: id(`entry:${category.name}:${index}`),
          userId,
          category: category.name,
          value: money((value * weight) / weightSum),
          month,
          currency,
        });
      });
    }
  }

  // Income: a salary with a raise six months ago, and some freelance work paid in euros.
  const salary = { id: id("income:salary"), name: "Salary" };
  const freelance = { id: id("income:freelance"), name: "Freelance" };
  fixtures.incomeSources.push(
    { ...salary, userId, currency: "SEK", color: "var(--purple-400)" },
    { ...freelance, userId, currency: "EUR", color: "var(--teal-400)" }
  );
  months.forEach((month, index) => {
    const monthsAgo = FINANCER_MONTHS - 1 - index;
    fixtures.incomeEntries.push({
      id: id(`income:salary:${month}`),
      userId,
      sourceId: salary.id,
      value: money(monthsAgo >= 6 ? 42000 : 44500),
      month,
    });
    if (random() < 0.5) {
      fixtures.incomeEntries.push({
        id: id(`income:freelance:${month}`),
        userId,
        sourceId: freelance.id,
        value: money(300 + Math.round(random() * 6) * 100),
        month,
      });
    }
  });

  // Assets: one value per source per month, growing with some noise.
  const assets = [
    {
      key: "nordnet",
      name: "Nordnet",
      currency: "SEK",
      color: "var(--blue-400)",
      start: 182000,
      growth: 0.011,
      noise: 0.03,
      add: 3000,
    },
    {
      key: "savings",
      name: "Savings account",
      currency: "SEK",
      color: "var(--green-400)",
      start: 58000,
      growth: 0.002,
      noise: 0,
      add: 2500,
    },
    {
      key: "sharesies",
      name: "Sharesies",
      currency: "NZD",
      color: "var(--teal-400)",
      start: 12400,
      growth: 0.009,
      noise: 0.04,
      add: 0,
    },
    {
      key: "pension",
      name: "Pension",
      currency: "SEK",
      color: "var(--moss-400)",
      start: 214000,
      growth: 0.006,
      noise: 0.015,
      add: 1800,
    },
  ];
  for (const asset of assets) {
    const sourceId = id(`asset:${asset.key}`);
    fixtures.assetSources.push({
      id: sourceId,
      userId,
      name: asset.name,
      currency: asset.currency,
      color: asset.color,
    });
    let value = asset.start;
    for (const month of months) {
      value = value * (1 + asset.growth + (random() - 0.5) * asset.noise) + asset.add;
      fixtures.assetEntries.push({
        id: id(`asset:${asset.key}:${month}`),
        userId,
        sourceId,
        value: money(value),
        month,
      });
    }
  }

  return fixtures;
}

import type { ChangelogEntry } from "../types";

export const financerEntries: ChangelogEntry[] = [
  {
    id: "financer-faster-spending-input",
    date: "2026-11-24",
    kind: "new",
    title: "Log a month of spending in one go",
    description:
      "Type an amount and the start of a category, press Enter, and the next line is ready. Totals per category help you check against your bank, and every row is saved at once.",
    apps: ["financer"],
  },
  {
    id: "financer-monthly-exchange-rates",
    date: "2026-11-23",
    kind: "improved",
    title: "Past months keep their own exchange rates",
    description:
      "A past month's spending, income and assets are converted at that month's rate, so old totals no longer move with today's rates.",
    apps: ["financer"],
  },
  {
    id: "financer-combine-entries",
    date: "2026-11-22",
    kind: "new",
    title: "Combine a month's entries",
    description:
      "One tap merges a month's spending, income or assets into a single line per category and currency, so a busy month stays readable.",
    apps: ["financer"],
  },
  {
    id: "financer-home-currency",
    date: "2026-10-24",
    kind: "improved",
    title: "One home currency for every app",
    description: "Set your home currency once, and the apps that convert money use it.",
    apps: ["financer", "scanner"],
  },
  {
    id: "financer-charts-per-line",
    date: "2026-08-08",
    kind: "new",
    title: "A chart for every source",
    description:
      "Spending by category, and income and assets by source, each with its own chart over the months.",
    apps: ["financer"],
  },
  {
    id: "financer-custom-categories",
    date: "2026-06-16",
    kind: "new",
    title: "Your own spending categories",
    description: "Add spending categories of your own beside the built-in ones.",
    apps: ["financer"],
  },
  {
    id: "financer-income-assets",
    date: "2026-05-31",
    kind: "new",
    title: "Income, and savings as assets",
    description:
      "Track income alongside spending, and follow your savings as assets, month by month.",
    apps: ["financer"],
  },
  {
    id: "financer-overview",
    date: "2026-05-25",
    kind: "improved",
    title: "Every chart on one page",
    description:
      "The overview shows all its charts at once instead of behind tabs, and logging many lines at once scrolls properly.",
    apps: ["financer"],
  },
  {
    id: "financer-launch",
    date: "2026-05-17",
    kind: "new",
    title: "Financer is live",
    description:
      "Track your spending, month by month, in several currencies, with charts that show where it goes.",
    apps: ["financer"],
  },
];

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
];

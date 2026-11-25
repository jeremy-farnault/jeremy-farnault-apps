import type { ChangelogEntry } from "../types";

export const scannerEntries: ChangelogEntry[] = [
  {
    id: "scanner-daily-email",
    date: "2026-11-03",
    kind: "new",
    title: "A morning email of deals",
    description:
      "Every morning, an email lists what's on sale, with prices, images, when each sale ends and where it's cheaper.",
    apps: ["scanner"],
  },
  {
    id: "scanner-cad",
    date: "2026-10-27",
    kind: "improved",
    title: "Canadian prices",
    description:
      "Canada joins the Steam and PlayStation Store regions, with prices in Canadian dollars.",
    apps: ["scanner"],
  },
  {
    id: "scanner-shop-discovery",
    date: "2026-10-26",
    kind: "new",
    title: "Find an item in other stores",
    description:
      "Scanner looks for an item you track in other PlayStation Store regions and on Steam, or by name, and lists by biggest discount first.",
    apps: ["scanner"],
  },
  {
    id: "scanner-launch",
    date: "2026-10-24",
    kind: "new",
    title: "Scanner is live",
    description:
      "Paste a product link from a shop, the PlayStation Store or Steam, and see where each item is cheapest, converted to your currency. Install it on your phone too.",
    apps: ["scanner"],
  },
];

import type { scannerItems, scannerLinks, scannerPriceChecks } from "@jf/db";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

export interface ScannerFixtures {
  items: (typeof scannerItems.$inferInsert)[];
  /**
   * Real Steam store pages, so that if Scanner rechecks one (it does for links checked more
   * than an hour ago when the wishlist opens), the check reads a real price instead of failing.
   * The seeder stamps their last check with the seeding time, so a capture run right after
   * seeding triggers no live checks.
   */
  links: (typeof scannerLinks.$inferInsert)[];
  checks: (typeof scannerPriceChecks.$inferInsert)[];
}

type Region = "SE" | "NZ" | "JP" | "US";
/** Steam's currency per region, as Scanner reads it. */
const CURRENCY: Record<Region, string> = { SE: "EUR", NZ: "NZD", JP: "JPY", US: "USD" };

interface LinkSpec {
  region: Region;
  /** Normal price in the currency's minor unit (cents; yen have none). */
  normal: number;
  /** Discount on the latest check, if on sale. */
  discount?: number;
  /** Days until the sale ends. */
  saleEndsIn?: number;
}

interface ItemSpec {
  key: string;
  name: string;
  appId: number;
  slug: string;
  addedDaysAgo: number;
  links: LinkSpec[];
  /** Bought this many days ago, at the first link's price. */
  boughtDaysAgo?: number;
}

const ITEMS: ItemSpec[] = [
  {
    key: "hades-2",
    name: "Hades II",
    appId: 1145350,
    slug: "Hades_II",
    addedDaysAgo: 60,
    links: [
      { region: "SE", normal: 2950, discount: 20, saleEndsIn: 4 },
      { region: "NZ", normal: 4499 },
      { region: "JP", normal: 3400, discount: 20, saleEndsIn: 4 },
    ],
  },
  {
    key: "silksong",
    name: "Hollow Knight: Silksong",
    appId: 1030300,
    slug: "Hollow_Knight_Silksong",
    addedDaysAgo: 45,
    links: [
      { region: "SE", normal: 1950 },
      { region: "US", normal: 1999 },
    ],
  },
  {
    key: "baldurs-gate-3",
    name: "Baldur's Gate 3",
    appId: 1086940,
    slug: "Baldurs_Gate_3",
    addedDaysAgo: 120,
    links: [
      { region: "SE", normal: 5999, discount: 40, saleEndsIn: 9 },
      { region: "NZ", normal: 9499, discount: 35, saleEndsIn: 9 },
    ],
  },
  {
    key: "elden-ring",
    name: "Elden Ring",
    appId: 1245620,
    slug: "ELDEN_RING",
    addedDaysAgo: 150,
    links: [
      { region: "SE", normal: 5999 },
      { region: "JP", normal: 7920, discount: 50, saleEndsIn: 2 },
    ],
  },
  {
    key: "disco-elysium",
    name: "Disco Elysium",
    appId: 632470,
    slug: "Disco_Elysium__The_Final_Cut",
    addedDaysAgo: 30,
    links: [{ region: "SE", normal: 3999, discount: 75, saleEndsIn: 6 }],
  },
  {
    key: "sekiro",
    name: "Sekiro: Shadows Die Twice",
    appId: 814380,
    slug: "Sekiro_Shadows_Die_Twice__GOTY_Edition",
    addedDaysAgo: 90,
    links: [
      { region: "SE", normal: 5999 },
      { region: "US", normal: 5999 },
    ],
  },
  {
    key: "outer-wilds",
    name: "Outer Wilds",
    appId: 753640,
    slug: "Outer_Wilds",
    addedDaysAgo: 20,
    links: [{ region: "NZ", normal: 3599, discount: 40, saleEndsIn: 11 }],
  },
  {
    key: "celeste",
    name: "Celeste",
    appId: 504230,
    slug: "Celeste",
    addedDaysAgo: 200,
    boughtDaysAgo: 40,
    links: [{ region: "SE", normal: 1999, discount: 75, saleEndsIn: -38 }],
  },
];

/** Scanner's name match key for a store page, close enough for the demo's plain names. */
function matchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .replace(/'/g, "");
}

/** Earlier readings of a link: the normal price a month and two weeks ago. */
const HISTORY_DAYS_AGO = [30, 14];

export function buildScannerFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): ScannerFixtures {
  const id = (key: string) => stableUuid(userId, `scanner:${key}`);
  const fixtures: ScannerFixtures = { items: [], links: [], checks: [] };

  for (const item of ITEMS) {
    const itemId = id(`item:${item.key}`);
    const added = atHour(addDays(today, -item.addedDaysAgo), 20);
    const first = item.links[0] as LinkSpec;
    const bought = item.boughtDaysAgo !== undefined;
    const boughtAt = bought ? atHour(addDays(today, -(item.boughtDaysAgo as number)), 21) : null;

    fixtures.items.push({
      id: itemId,
      userId,
      name: item.name,
      imageKey: null,
      status: bought ? "bought" : "wishlist",
      boughtPrice: bought ? Math.round(first.normal * (1 - (first.discount ?? 0) / 100)) : null,
      boughtCurrency: bought ? CURRENCY[first.region] : null,
      boughtStore: bought ? "Steam" : null,
      boughtAt,
      createdAt: added,
      updatedAt: boughtAt ?? added,
    });

    for (const link of item.links) {
      const linkId = id(`link:${item.key}:${link.region}`);
      const url = `https://store.steampowered.com/app/${item.appId}/${item.slug}/`;
      // Bought items stopped being checked when they were bought.
      const lastDaysAgo = item.boughtDaysAgo ?? 0;
      const lastChecked = atHour(addDays(today, -lastDaysAgo), lastDaysAgo === 0 ? 6 : 21);
      fixtures.links.push({
        id: linkId,
        itemId,
        userId,
        url,
        normalizedUrl: `store.steampowered.com/app/${item.appId}`,
        store: "steam",
        region: link.region,
        editionId: null,
        editionName: null,
        matchKey: matchKey(item.name),
        conceptId: null,
        lastStatus: "ok",
        lastCheckedAt: lastChecked,
        lastSuccessAt: lastChecked,
        createdAt: added,
      });

      const currency = CURRENCY[link.region];
      for (const daysAgo of HISTORY_DAYS_AGO.filter(
        (d) => d < item.addedDaysAgo && d > lastDaysAgo
      )) {
        fixtures.checks.push({
          id: id(`check:${item.key}:${link.region}:${daysAgo}`),
          linkId,
          normalPrice: link.normal,
          salePrice: null,
          currency,
          inStock: true,
          discountPercent: null,
          saleEndsAt: null,
          checkedAt: atHour(addDays(today, -daysAgo), 7),
        });
      }
      const onSale = link.discount !== undefined;
      fixtures.checks.push({
        id: id(`check:${item.key}:${link.region}:latest`),
        linkId,
        normalPrice: link.normal,
        salePrice: onSale ? Math.round(link.normal * (1 - (link.discount as number) / 100)) : null,
        currency,
        inStock: true,
        discountPercent: link.discount ?? null,
        saleEndsAt:
          onSale && link.saleEndsIn !== undefined
            ? atHour(addDays(today, link.saleEndsIn), 17)
            : null,
        checkedAt: lastChecked,
      });
    }
  }

  return fixtures;
}

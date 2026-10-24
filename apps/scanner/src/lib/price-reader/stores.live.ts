import { describe, expect, it } from "vitest";
import { readPrice } from "./index";

// Reads one real page per adapter and prints what came back. Run it when a store seems
// broken, or before relying on a new shop:
//
//   pnpm --filter @jf/scanner live-check
//   LIVE_URL=<link> [LIVE_REGION=JP] pnpm --filter @jf/scanner live-check
//
// With LIVE_URL only that link is read; LIVE_REGION picks a Steam storefront.

const DEFAULTS: { label: string; url: string; region?: string }[] = [
  {
    label: "PS Store SE",
    url: "https://store.playstation.com/sv-se/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  },
  {
    label: "PS Store NZ",
    url: "https://store.playstation.com/en-nz/product/EP9000-PPSA01521_00-FORBIDDENWESTPS5",
  },
  {
    label: "PS Store JP",
    url: "https://store.playstation.com/ja-jp/product/JP9000-PPSA04073_00-FORBIDDENWESTPS5",
  },
  {
    label: "Steam SE",
    url: "https://store.steampowered.com/app/570940/DARK_SOULS_REMASTERED/",
    region: "SE",
  },
  {
    label: "Web shop (Kjell, JSON-LD)",
    url: "https://www.kjell.com/se/produkter/sakerhet-overvakning/kameraovervakning/overvakningskameror/natverkskameror/eufy-eufycam-s4-solo-3-i-1-overvakningskamera-med-solpanel-p66975",
  },
];

const targets = process.env.LIVE_URL
  ? [{ label: "LIVE_URL", url: process.env.LIVE_URL, region: process.env.LIVE_REGION ?? "SE" }]
  : DEFAULTS;

describe("live store check", () => {
  for (const target of targets) {
    it(target.label, async () => {
      const result = await readPrice(target.url, { region: target.region ?? null });
      if (!result.ok) {
        console.log(
          `✗ ${target.label}: ${result.reason}${result.detail ? ` (${result.detail})` : ""}`
        );
      } else {
        const { reading } = result;
        console.log(`✓ ${target.label}: ${reading.name} [${reading.region ?? "no region"}]`);
        for (const e of reading.editions) {
          const sale = e.salePrice !== null ? ` → ${e.salePrice}` : "";
          const ends = e.saleEndsAt ? ` until ${e.saleEndsAt.toISOString().slice(0, 10)}` : "";
          console.log(
            `    ${e.name}: ${e.normalPrice}${sale} ${e.currency}${ends}${e.inStock ? "" : " (out of stock)"}`
          );
        }
      }
      expect(result.ok, `${target.label} should read a price`).toBe(true);
      if (result.ok) expect(result.reading.editions.length).toBeGreaterThan(0);
    });
  }
});

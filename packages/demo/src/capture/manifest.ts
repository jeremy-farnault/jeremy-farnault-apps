import type { Page } from "@playwright/test";

import { stableUuid } from "../fixtures/determinism";

export type Viewport = "desktop" | "mobile";

/** What a shot can know about the run: the demo user, and the ids its fixtures were given. */
export interface ShotContext {
  userId: string;
  /** The id a fixture row was seeded with, from the key its builder used. */
  fixtureId: (key: string) => string;
}

export interface Shot {
  /** Becomes the file name (`01-home.png`). Mobile shots are named for you. */
  name: string;
  viewport: Viewport;
  /** Path on the app's deployed URL. */
  path: string | ((context: ShotContext) => string);
  /** Steps to run once the page has settled, before the capture (open a modal, start a timer). */
  before?: (page: Page) => Promise<void>;
  /** Extra wait after settling, for JS-driven animations such as chart transitions. */
  settleMs?: number;
}

/** Each app's shots, in carousel order. Apps without an entry keep their hand-made screenshots. */
export const MANIFESTS: Record<string, Shot[]> = {
  routiner: [
    { name: "home", viewport: "desktop", path: "/" },
    {
      name: "charts",
      viewport: "desktop",
      path: ({ fixtureId }) => `/habit/${fixtureId("routiner:habit:read")}`,
      settleMs: 1500,
    },
    { name: "mobile", viewport: "mobile", path: "/" },
  ],
};

export function makeShotContext(userId: string): ShotContext {
  return { userId, fixtureId: (key) => stableUuid(userId, key) };
}

/**
 * File names in carousel order: desktop shots `01-name`, `02-name`…; mobile shots last, ending at
 * `99-mobile` (`98-mobile-<name>` before it when an app has more than one).
 */
export function fileNames(shots: readonly Shot[]): string[] {
  const mobileCount = shots.filter((shot) => shot.viewport === "mobile").length;
  let desktopIndex = 0;
  let mobileIndex = 0;
  return shots.map((shot) => {
    if (shot.viewport === "desktop") {
      desktopIndex++;
      return `${String(desktopIndex).padStart(2, "0")}-${shot.name}.png`;
    }
    const number = 99 - (mobileCount - 1) + mobileIndex++;
    return mobileCount === 1 ? `${number}-mobile.png` : `${number}-mobile-${shot.name}.png`;
  });
}

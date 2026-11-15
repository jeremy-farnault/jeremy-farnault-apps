import { withTransaction } from "@jf/db";

import { type DemoApp, type DemoFixtures, type IsoDate, buildDemoFixtures } from "../fixtures";
import { assertDemoUser } from "./account";
import { RESETS } from "./apps";
import type { Tx } from "./types";

function resetApp<A extends DemoApp>(app: A, tx: Tx, userId: string, fixtures: DemoFixtures) {
  return RESETS[app](tx, userId, fixtures[app]);
}

/** Replaces the demo user's data in each app with the fixtures, one transaction per app. */
export async function seedDemoApps(userId: string, apps: readonly DemoApp[], today: IsoDate) {
  const fixtures = buildDemoFixtures({ userId, today });
  for (const app of apps) {
    await withTransaction(async (tx) => {
      await assertDemoUser(tx, userId);
      await resetApp(app, tx, userId, fixtures);
    });
    console.log(`  ✓ ${app}`);
  }
}

export { assertDemoUser, ensureDemoAccount } from "./account";

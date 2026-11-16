// pnpm seed:demo [app]
// Creates the demo account if needed, then replaces its data in the named app, or every app.
// Needs DATABASE_URL and DEMO_PASSWORD (read from the repo root's .env when present).

import { DEMO_APPS, type DemoApp, todayInStockholm } from "../fixtures";
import { ensureDemoAccount, seedDemoApps } from "../seed";

async function main() {
  const [requested] = process.argv.slice(2);
  if (requested && !(DEMO_APPS as readonly string[]).includes(requested)) {
    throw new Error(`Unknown app "${requested}". Known apps: ${DEMO_APPS.join(", ")}.`);
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password) throw new Error("DEMO_PASSWORD is not set (add it to the repo root's .env).");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

  const userId = await ensureDemoAccount(password);
  const apps: readonly DemoApp[] = requested ? [requested as DemoApp] : DEMO_APPS;
  const today = todayInStockholm();
  console.log(`Seeding the demo user, dated from ${today}:`);
  await seedDemoApps(userId, apps, today);
}

main().catch((error: unknown) => {
  // AWS SDK errors can carry a bare name ("UnknownError"), so show the status too.
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(status ? `${message} (HTTP ${status})` : message);
  process.exit(1);
});

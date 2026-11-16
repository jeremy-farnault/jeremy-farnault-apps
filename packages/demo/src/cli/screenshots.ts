// pnpm screenshots [app]
// Signs in as the demo user and captures each app's shots into Indexer's screenshot folder.
// Needs DEMO_PASSWORD, NEXT_PUBLIC_AUTH_URL and each app's NEXT_PUBLIC_<APP>_URL, read from the
// repo root's .env, then .env.production when present (so production URLs can override local ones).

import { MANIFESTS } from "../capture/manifest";
import { CaptureError, captureApps } from "../capture/run";

async function main() {
  const known = Object.keys(MANIFESTS);
  const [requested] = process.argv.slice(2);
  if (requested && !known.includes(requested)) {
    throw new CaptureError(`No shots for "${requested}". Apps with shots: ${known.join(", ")}.`);
  }
  const password = process.env.DEMO_PASSWORD;
  if (!password)
    throw new CaptureError("DEMO_PASSWORD is not set (add it to the repo root's .env).");

  const apps = requested ? [requested] : known;
  console.log(`Capturing as the demo user, from ${process.env.NEXT_PUBLIC_AUTH_URL ?? "?"}:`);
  const failed = await captureApps(apps, password);
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

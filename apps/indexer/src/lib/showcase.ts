import { readdirSync } from "node:fs";
import path from "node:path";
import { EXCLUDED_APP_IDS, type ShowcaseApp, descriptions } from "@/config/showcase";
import { apps } from "@jf/ui/config/apps";

const IMAGE_RE = /\.(png|jpe?g|webp|avif)$/i;

function readScreenshots(id: string): string[] {
  try {
    const dir = path.join(process.cwd(), "public", "screenshots", id);
    return readdirSync(dir)
      .filter((file) => IMAGE_RE.test(file))
      .sort()
      .map((file) => `/screenshots/${id}/${file}`);
  } catch {
    // Directory doesn't exist yet — no screenshots for this app.
    return [];
  }
}

function toShowcaseApp(app: (typeof apps)[number]): ShowcaseApp {
  return {
    id: app.id,
    name: app.name,
    href: app.href,
    accentColor: app.accentColor ?? "--grey-400",
    description: descriptions[app.id] ?? "",
    screenshots: readScreenshots(app.id),
  };
}

/** Apps shown in the landing grid, in registry order, minus excluded ones. */
export function getShowcaseApps(): ShowcaseApp[] {
  return apps.filter((app) => !EXCLUDED_APP_IDS.has(app.id)).map(toShowcaseApp);
}

export function getShowcaseApp(id: string): ShowcaseApp | undefined {
  if (EXCLUDED_APP_IDS.has(id)) return undefined;
  const app = apps.find((candidate) => candidate.id === id);
  return app ? toShowcaseApp(app) : undefined;
}

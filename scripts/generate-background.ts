/**
 * Turns a line-art SVG (dark lines on a white background, as Recraft exports it) into an app's
 * background scene: `apps/<app>/public/background.svg`.
 *
 *   pnpm generate:background <input.svg> <app>
 *
 * The scene is used as a stencil (see `.app-background` in packages/ui/src/globals.css), so
 * only its opacity matters. A filter maps lightness to transparency: dark lines become opaque,
 * white becomes transparent. Done this way rather than by deleting the white shapes because
 * Recraft draws the gaps inside lines as white shapes stacked on top of dark ones.
 *
 * Then pass `background="/background.svg"` to the app's `AppShell`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

const INK_FILTER =
  '<defs><filter id="ink" color-interpolation-filters="sRGB">' +
  '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 0 1"/>' +
  "</filter></defs>";

function toScene(svg: string): string {
  const cleaned = svg
    .replace(/<\?xml[^>]*\?>/g, "")
    // Provenance manifest (C2PA), tens of KB that the browser never uses.
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
    .trim();

  const openTag = cleaned.match(/<svg[^>]*>/)?.[0];
  const closeAt = cleaned.lastIndexOf("</svg>");
  if (!openTag || closeAt === -1) throw new Error("Input is not an SVG document.");
  if (!/viewBox=/.test(openTag)) throw new Error("Input SVG has no viewBox; it won't scale.");

  const body = cleaned.slice(cleaned.indexOf(openTag) + openTag.length, closeAt);
  return `${openTag}${INK_FILTER}<g filter="url(#ink)">${body}</g></svg>\n`;
}

const [input, app] = process.argv.slice(2);
if (!input || !app) {
  console.error("Usage: pnpm generate:background <input.svg> <app>");
  process.exit(1);
}

const publicDir = resolve(ROOT, "apps", app, "public");
if (!existsSync(publicDir)) {
  console.error(`No app named "${app}" (looked for ${publicDir}).`);
  process.exit(1);
}

const output = resolve(publicDir, "background.svg");
const scene = toScene(readFileSync(resolve(input), "utf8"));
writeFileSync(output, scene);
console.log(`Wrote ${output} (${(scene.length / 1024).toFixed(1)} KB)`);

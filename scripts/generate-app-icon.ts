import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const RANKING_PATH =
  "M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z";

function buildSvg(color: string, iconPath: string, size: number): string {
  const padding = size * 0.2;
  const iconSize = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.195)}" fill="${color}"/>
  <svg x="${padding}" y="${padding}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256">
    <path fill="white" d="${iconPath}"/>
  </svg>
</svg>`;
}

function parseArgs(): { color: string; out: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const color = get("--color");
  const out = get("--out");
  if (!color || !out) {
    console.error("Usage: tsx scripts/generate-app-icon.ts --color <hex> --out <dir>");
    process.exit(1);
  }
  return { color, out };
}

async function generate() {
  const { color, out } = parseArgs();
  const iconsDir = resolve(out, "icons");
  await mkdir(iconsDir, { recursive: true });

  const sizes: [number, string][] = [
    [512, resolve(iconsDir, "icon-512x512.png")],
    [192, resolve(iconsDir, "icon-192x192.png")],
    [64, resolve(out, "favicon.png")],
  ];

  for (const [size, dest] of sizes) {
    const svg = buildSvg(color, RANKING_PATH, size);
    await sharp(Buffer.from(svg)).png().toFile(dest);
    console.log(`✓ ${dest}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

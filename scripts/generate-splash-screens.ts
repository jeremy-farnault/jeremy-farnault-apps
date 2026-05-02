import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const DEVICES = [
  // iPhone SE 1st gen
  { width: 640, height: 1136, name: "splash-640x1136.png" },
  // iPhone 8, SE 2nd/3rd gen
  { width: 750, height: 1334, name: "splash-750x1334.png" },
  // iPhone X, XS, 11 Pro
  { width: 1125, height: 2436, name: "splash-1125x2436.png" },
  // iPhone XR, 11
  { width: 828, height: 1792, name: "splash-828x1792.png" },
  // iPhone XS Max, 11 Pro Max
  { width: 1242, height: 2688, name: "splash-1242x2688.png" },
  // iPhone 12 mini, 13 mini
  { width: 1080, height: 2340, name: "splash-1080x2340.png" },
  // iPhone 12, 12 Pro, 13, 13 Pro, 14
  { width: 1170, height: 2532, name: "splash-1170x2532.png" },
  // iPhone 12 Pro Max, 13 Pro Max, 14 Plus
  { width: 1284, height: 2778, name: "splash-1284x2778.png" },
  // iPhone 14 Pro, 15, 15 Pro
  { width: 1179, height: 2556, name: "splash-1179x2556.png" },
  // iPhone 14 Pro Max, 15 Plus, 15 Pro Max
  { width: 1290, height: 2796, name: "splash-1290x2796.png" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: Number.parseInt(result[1], 16),
    g: Number.parseInt(result[2], 16),
    b: Number.parseInt(result[3], 16),
  };
}

function parseArgs(): { color: string; icon: string; out: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const color = get("--color");
  const icon = get("--icon");
  const out = get("--out");
  if (!color || !icon || !out) {
    console.error(
      "Usage: tsx scripts/generate-splash-screens.ts --color <hex> --icon <icon-path> --out <dir>"
    );
    process.exit(1);
  }
  return { color, icon, out };
}

async function generate() {
  const { color, icon, out } = parseArgs();
  const { r, g, b } = hexToRgb(color);
  const splashDir = resolve(out, "icons", "splash");
  await mkdir(splashDir, { recursive: true });

  for (const device of DEVICES) {
    const iconSize = Math.round(device.width * 0.28);
    const iconBuffer = await sharp(icon).resize(iconSize, iconSize).toBuffer();

    const dest = resolve(splashDir, device.name);
    await sharp({
      create: {
        width: device.width,
        height: device.height,
        channels: 3,
        background: { r, g, b },
      },
    })
      .composite([
        {
          input: iconBuffer,
          left: Math.round((device.width - iconSize) / 2),
          top: Math.round((device.height - iconSize) / 2),
        },
      ])
      .png()
      .toFile(dest);

    console.log(`✓ ${dest}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

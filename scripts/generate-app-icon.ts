import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const RANKING_PATH =
  "M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z";

const COINS_PATH =
  "M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57ZM232,132c0,13.22-30.79,28-72,28-3.73,0-7.43-.13-11.08-.37C170.49,151.77,184,139,184,124V105.74C213.87,110.19,232,122.27,232,132ZM72,150.25V126.46A183.74,183.74,0,0,0,96,128a183.74,183.74,0,0,0,24-1.54v23.79A163,163,0,0,1,96,152,163,163,0,0,1,72,150.25Zm96-40.32V124c0,8.39-12.41,17.4-32,22.87V123.5C148.91,120.37,159.84,115.71,168,109.93ZM96,56c41.21,0,72,14.78,72,28s-30.79,28-72,28S24,97.22,24,84,54.79,56,96,56ZM24,124V109.93c8.16,5.78,19.09,10.44,32,13.57v23.37C36.41,141.4,24,132.39,24,124Zm64,48v-4.17c2.63.1,5.29.17,8,.17,3.88,0,7.67-.13,11.39-.35A121.92,121.92,0,0,0,120,171.41v23.46C100.41,189.4,88,180.39,88,172Zm48,26.25V174.4a179.48,179.48,0,0,0,24,1.6,183.74,183.74,0,0,0,24-1.54v23.79a165.45,165.45,0,0,1-48,0Zm64-3.38V171.5c12.91-3.13,23.84-7.79,32-13.57V172C232,180.39,219.59,189.4,200,194.87Z";

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

function buildMaskableSvg(color: string, iconPath: string, size: number): string {
  const padding = size * 0.1;
  const iconSize = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <svg x="${padding}" y="${padding}" width="${iconSize}" height="${iconSize}" viewBox="0 0 256 256">
    <path fill="white" d="${iconPath}"/>
  </svg>
</svg>`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function parseArgs(): { color: string; out: string; icon: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const color = get("--color");
  const out = get("--out");
  if (!color || !out) {
    console.error(
      "Usage: tsx scripts/generate-app-icon.ts --color <hex> --out <dir> [--icon coins|ranking]"
    );
    process.exit(1);
  }
  return { color, out, icon: get("--icon") ?? "ranking" };
}

async function generate() {
  const { color, out, icon } = parseArgs();
  const iconPath = icon === "coins" ? COINS_PATH : RANKING_PATH;
  const iconsDir = resolve(out, "icons");
  const splashDir = resolve(iconsDir, "splash");
  await mkdir(splashDir, { recursive: true });

  // Regular icons
  const sizes: [number, string][] = [
    [512, resolve(iconsDir, "icon-512x512.png")],
    [192, resolve(iconsDir, "icon-192x192.png")],
    [64, resolve(out, "favicon.png")],
  ];
  for (const [size, dest] of sizes) {
    const svg = buildSvg(color, iconPath, size);
    await sharp(Buffer.from(svg)).png().toFile(dest);
    console.log(`✓ ${dest}`);
  }

  // Maskable icon
  const maskableDest = resolve(iconsDir, "icon-512x512-maskable.png");
  const maskableSvg = buildMaskableSvg(color, iconPath, 512);
  await sharp(Buffer.from(maskableSvg)).png().toFile(maskableDest);
  console.log(`✓ ${maskableDest}`);

  // Splash screens
  const iconBuffer = await sharp(Buffer.from(buildSvg(color, iconPath, 256)))
    .png()
    .toBuffer();
  const bg = hexToRgb(color);
  const splashSizes: [number, number][] = [
    [640, 1136],
    [750, 1334],
    [1125, 2436],
    [828, 1792],
    [1242, 2688],
    [1080, 2340],
    [1170, 2532],
    [1284, 2778],
    [1179, 2556],
    [1290, 2796],
  ];
  for (const [w, h] of splashSizes) {
    const dest = resolve(splashDir, `splash-${w}x${h}.png`);
    await sharp({
      create: { width: w, height: h, channels: 3, background: bg },
    })
      .composite([{ input: iconBuffer, gravity: "center" }])
      .png()
      .toFile(dest);
    console.log(`✓ ${dest}`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});

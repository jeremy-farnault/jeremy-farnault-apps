import sharp from "sharp";

import { seededRandom } from "../fixtures/determinism";

/**
 * Generated landscape art for the demo user's photos: deterministic, with no licence and no
 * download. A composition, a palette and a size; the seed varies the shapes.
 */
export interface ArtSpec {
  composition: "ridges" | "sea" | "dunes" | "forest" | "night";
  palette: keyof typeof PALETTES;
  width: number;
  height: number;
  seed: string;
}

/** Sky top, sky bottom, sun, then land layers from far to near. */
const PALETTES = {
  dawn: ["#f6d5c3", "#fbe9d7", "#fff4e0", "#d9a7a0", "#b9807f", "#8d5c66", "#5e3a4d"],
  dusk: ["#2b2350", "#e9826b", "#ffd08a", "#7a4f7d", "#553a6b", "#3a2a55", "#21183a"],
  winter: ["#cfe3f2", "#f4f8fb", "#ffffff", "#a9c4d9", "#7f9fbb", "#56789a", "#34506d"],
  desert: ["#f3c98b", "#fbe3b4", "#fff1cf", "#e1a35f", "#c97f42", "#a35d2c", "#713e1c"],
  mist: ["#cfdcd3", "#eef2ee", "#f7f9f6", "#9fb8a8", "#7a9a86", "#557564", "#344f42"],
  midnight: ["#0b1630", "#20365e", "#f2efe0", "#1b2b4d", "#15223e", "#0f1930", "#090f20"],
} as const;

function ridge(
  width: number,
  height: number,
  base: number,
  roughness: number,
  random: () => number
) {
  const steps = 9;
  const points = [`0,${height}`];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = base - random() * roughness;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  points.push(`${width},${height}`);
  return points.join(" ");
}

function wave(
  width: number,
  height: number,
  base: number,
  amplitude: number,
  random: () => number
) {
  const segments = 4;
  let d = `M0,${base}`;
  for (let i = 0; i < segments; i++) {
    const x0 = (i / segments) * width;
    const x1 = ((i + 1) / segments) * width;
    const lift = (random() - 0.5) * amplitude * 2;
    d += ` C${x0 + (x1 - x0) / 3},${base + lift} ${x0 + ((x1 - x0) * 2) / 3},${base - lift} ${x1},${base}`;
  }
  return `${d} L${width},${height} L0,${height} Z`;
}

export function artSvg(spec: ArtSpec): string {
  const { width: w, height: h } = spec;
  const [skyTop, skyBottom, sun, ...layers] = PALETTES[spec.palette];
  const random = seededRandom(spec.seed);
  const sunX = w * (0.25 + random() * 0.5);
  const sunY = h * (0.2 + random() * 0.2);
  const sunR = Math.min(w, h) * (0.06 + random() * 0.05);
  const parts: string[] = [];

  if (spec.composition === "night") {
    for (let i = 0; i < 90; i++) {
      const r = (random() * 1.6 + 0.4) * (w / 1500);
      parts.push(
        `<circle cx="${(random() * w).toFixed(1)}" cy="${(random() * h * 0.6).toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.4 + random() * 0.6).toFixed(2)}"/>`
      );
    }
  }
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="${sun}" opacity="0.95"/>`);

  layers.forEach((color, i) => {
    const depth = i / (layers.length - 1);
    if (spec.composition === "ridges" || spec.composition === "night") {
      const base = h * (0.5 + depth * 0.32);
      parts.push(
        `<polygon points="${ridge(w, h, base, h * (0.22 - depth * 0.1), random)}" fill="${color}"/>`
      );
    } else if (spec.composition === "dunes") {
      parts.push(
        `<path d="${wave(w, h, h * (0.55 + depth * 0.12), h * 0.08, random)}" fill="${color}"/>`
      );
    } else if (spec.composition === "forest") {
      const base = h * (0.55 + depth * 0.13);
      parts.push(`<path d="${wave(w, h, base, h * 0.04, random)}" fill="${color}"/>`);
      const trees = 10 + i * 6;
      for (let t = 0; t < trees; t++) {
        const x = random() * w;
        const tw = (w / 60) * (1 + depth * 1.5);
        const th = tw * (3 + random() * 1.5);
        parts.push(
          `<polygon points="${x - tw},${base + 4} ${x},${base - th} ${x + tw},${base + 4}" fill="${color}"/>`
        );
      }
    } else {
      // Sea: one far headland, then flat water bands with the sun's reflection.
      if (i === 0) {
        parts.push(
          `<polygon points="${ridge(w * 0.55, h, h * 0.6, h * 0.12, random)}" fill="${color}"/>`
        );
      } else {
        const top = h * (0.6 + (depth - 1 / (layers.length - 1)) * 0.4);
        parts.push(`<rect x="0" y="${top}" width="${w}" height="${h - top}" fill="${color}"/>`);
      }
    }
  });

  if (spec.composition === "sea") {
    for (let i = 0; i < 14; i++) {
      const y = h * 0.62 + i * h * 0.025;
      const half = sunR * (1.4 - i * 0.07) * (0.6 + random() * 0.4);
      parts.push(
        `<rect x="${sunX - half}" y="${y}" width="${half * 2}" height="${h * 0.006}" fill="${sun}" opacity="${(0.55 - i * 0.03).toFixed(2)}"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#sky)"/>
${parts.join("\n")}
</svg>`;
}

const COMPOSITIONS: ArtSpec["composition"][] = ["ridges", "sea", "dunes", "forest", "night"];
const PALETTE_NAMES = Object.keys(PALETTES) as ArtSpec["palette"][];

/**
 * Art picked from a seed alone, for images that only need to look good (Journaler's entries):
 * the composition and palette come from the seed, so the same seed always gives the same art.
 * Night skies only get the midnight palette, and midnight only goes with night or sea.
 */
export function artFor(seed: string, width: number, height: number): ArtSpec {
  const random = seededRandom(`pick:${seed}`);
  const composition = COMPOSITIONS[Math.floor(random() * COMPOSITIONS.length)] ?? "ridges";
  const daytime = PALETTE_NAMES.filter((name) => name !== "midnight");
  const palette =
    composition === "night"
      ? "midnight"
      : (daytime[Math.floor(random() * daytime.length)] ?? "dawn");
  return { composition, palette, width, height, seed };
}

/** The art as a JPEG, at its declared size. */
export async function renderArt(spec: ArtSpec): Promise<Buffer> {
  return sharp(Buffer.from(artSvg(spec)))
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

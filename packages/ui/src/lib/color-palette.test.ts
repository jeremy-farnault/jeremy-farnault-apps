// @vitest-environment node
// Reads globals.css from disk, which needs a file: import.meta.url.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COLOR_PALETTE,
  HIGHLIGHT_PALETTE,
  TEXT_COLOR_PALETTE,
  getColorForeground,
  isDarkSurface,
} from "./color-palette";
import type { ResolvedTheme } from "./theme";

/** The `-600` swatches that take light text in light mode and dark text in dark mode. */
const STRONG_DARK_SWATCHES = [
  "var(--blue-600)",
  "var(--purple-600)",
  "var(--magenta-600)",
  "var(--red-600)",
];

describe("getColorForeground", () => {
  it("pairs light swatches with dark text", () => {
    expect(getColorForeground("var(--yellow-400)")).toBe("var(--grey-900)");
    expect(getColorForeground("var(--green-600)")).toBe("var(--grey-900)");
  });

  it("pairs the blue/purple/magenta/red dark swatches with the theme-following token", () => {
    for (const value of STRONG_DARK_SWATCHES) {
      expect(getColorForeground(value)).toBe("var(--text-on-strong-hue)");
    }
  });

  it("falls back to dark text for a value outside the palette", () => {
    expect(getColorForeground("var(--moss-800)")).toBe("var(--grey-900)");
  });
});

describe("isDarkSurface", () => {
  it("defaults to the light theme", () => {
    expect(isDarkSurface("var(--blue-600)")).toBe(true);
    expect(isDarkSurface("var(--blue-400)")).toBe(false);
  });

  it("treats the blue/purple/magenta/red dark swatches as dark only in light mode", () => {
    for (const value of STRONG_DARK_SWATCHES) {
      expect(isDarkSurface(value, "light")).toBe(true);
      expect(isDarkSurface(value, "dark")).toBe(false);
    }
  });

  it("finds no dark surface in the palette in dark mode", () => {
    expect(COLOR_PALETTE.filter((c) => isDarkSurface(c.value, "dark"))).toEqual([]);
  });
});

// ─── Contrast against the real token values ──────────────────────────────────

const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [, name, hex] of block.matchAll(/--([a-z]+-\d+):\s*(#[0-9a-f]{6});/g)) {
    if (name && hex) map[name] = hex;
  }
  return map;
}

const lightTokens = tokens(css.slice(css.indexOf(":root {"), css.indexOf("  .dark {")));
const darkTokens = { ...lightTokens, ...tokens(css.slice(css.indexOf("  .dark {"))) };
const CARD: Record<ResolvedTheme, string> = { light: "#fafafa", dark: "#2e2e33" };

/** Resolves a `var(--x)` palette or foreground value to its hex in `theme`. */
function resolve(value: string | undefined, theme: ResolvedTheme): string {
  const name = /^var\(--([a-z0-9-]+)\)$/.exec(value ?? "")?.[1];
  if (name === "text-on-strong-hue") {
    return resolve(theme === "light" ? "var(--grey-100)" : "var(--grey-900)", theme);
  }
  const hex = name && (theme === "light" ? lightTokens : darkTokens)[name];
  if (!hex) throw new Error(`No ${theme} value for ${value}`);
  return hex;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("palette contrast in dark mode", () => {
  it("gives every hue a dark value at every level", () => {
    const hues = ["yellow", "moleskine", "taupe", "beige", "green", "red", "magenta", "purple"];
    for (const hue of [...hues, "blue", "teal", "moss"]) {
      const levels = Object.keys(lightTokens).filter((n) => n.startsWith(`${hue}-`));
      expect(levels.length).toBeGreaterThan(0);
      for (const level of levels) expect(darkTokens[level]).not.toBe(lightTokens[level]);
    }
  });

  it("keeps each choice swatch's foreground at 4.5:1 or better", () => {
    for (const item of COLOR_PALETTE) {
      const fg = resolve(item.foreground, "dark");
      expect(contrast(resolve(item.value, "dark"), fg), item.label).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps dark text legible on every highlight swatch", () => {
    for (const item of HIGHLIGHT_PALETTE) {
      const swatch = resolve(item.value, "dark");
      expect(contrast(swatch, resolve(item.foreground, "dark")), item.label).toBeGreaterThanOrEqual(
        4.5
      );
      expect(contrast(swatch, CARD.dark), item.label).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps every text colour but grey at 4.5:1 on the dark card", () => {
    for (const item of TEXT_COLOR_PALETTE.filter((c) => c.label !== "Grey")) {
      expect(contrast(resolve(item.value, "dark"), CARD.dark), item.label).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });
});

describe("text roles in dark mode", () => {
  const dark = css.slice(css.indexOf("  .dark {"));
  const role = (name: string) => {
    const hex = new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`).exec(dark)?.[1];
    if (!hex) throw new Error(`No dark value for --${name}`);
    return hex;
  };

  it("keeps body, secondary and muted text at 4.5:1 on the dark card, subtle at 3:1", () => {
    for (const name of ["text", "text-secondary", "text-muted"]) {
      expect(contrast(role(name), CARD.dark), name).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(role("text-subtle"), CARD.dark)).toBeGreaterThanOrEqual(3);
  });

  it("orders the text roles from strongest to faintest, as in light mode", () => {
    const steps = ["text", "text-secondary", "text-muted", "text-subtle"].map((n) =>
      contrast(role(n), CARD.dark)
    );
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1] ?? 0);
  });
});

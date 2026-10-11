import type { ResolvedTheme } from "./theme";

export type PaletteItem = { value: string; label?: string; foreground?: string };

/** Light text token, for use on dark-surfaced palette colors. */
// dark-mode-fixed: pairs with a fixed swatch, not with the page.
const ON_DARK = "var(--grey-100)";
/** Default (dark) text token, for use on light-surfaced palette colors. */
// dark-mode-fixed: every ON_LIGHT swatch stays a light fill in dark mode.
const ON_LIGHT = "var(--grey-900)";
/**
 * Text token for a shade that is dark in light mode but light in dark mode, where the hue
 * scales flip to ink tints: `ON_DARK` in light, `ON_LIGHT` in dark. Being a CSS variable, it
 * resolves for the active theme on its own — no theme has to be known when rendering.
 */
const ON_STRONG_HUE = "var(--text-on-strong-hue)";

/**
 * The shared color-choice palette used by the fleet's accent/tag color pickers.
 * Dark variants (the `-600` tokens) sit immediately after their light counterpart.
 *
 * `foreground` is the recommended text/icon color to render *on* each background.
 * Note that the `-600` tokens are not uniformly dark in luminance: yellow and green
 * "dark" are mid-bright and still read best with dark text, so only blue/purple/red
 * dark carry a light foreground — and only in light mode. In dark mode every `-600` is a
 * lighter tint than its `-400` and takes dark text, which `ON_STRONG_HUE` follows.
 *
 * Contrast of each swatch against its foreground (light mode / dark mode):
 *
 *   Grey 11.0 / 11.0     Taupe 5.8 / 4.7      Beige 7.2 / 4.7      Moss 7.4 / 4.7
 *   Yellow 8.7 / 5.5     Yellow Dark 5.7 / 6.8
 *   Green 8.6 / 5.5      Green Dark 5.3 / 6.8
 *   Teal 7.4 / 4.7       Teal Dark 4.2 / 6.8
 *   Blue 5.2 / 4.7       Blue Dark 6.3 / 6.8
 *   Purple 5.4 / 4.7     Purple Dark 5.9 / 6.8
 *   Magenta 5.3 / 4.7    Red 5.4 / 4.7        Red Dark 5.5 / 6.8
 *
 * Teal Dark is the one light-mode pairing under 4.5:1; it predates dark mode. Grey has no
 * dark scale — greys stay fixed and dark mode goes through the role tokens — so it reads
 * the same in both modes.
 */
export const COLOR_PALETTE: readonly PaletteItem[] = [
  // dark-mode-fixed: a stored colour; the Grey chip stays light in both modes.
  { label: "Grey", value: "var(--grey-200)", foreground: ON_LIGHT },
  { label: "Taupe", value: "var(--taupe-400)", foreground: ON_LIGHT },
  { label: "Beige", value: "var(--beige-400)", foreground: ON_LIGHT },
  { label: "Yellow", value: "var(--yellow-400)", foreground: ON_LIGHT },
  { label: "Yellow Dark", value: "var(--yellow-600)", foreground: ON_LIGHT },
  { label: "Green", value: "var(--green-400)", foreground: ON_LIGHT },
  { label: "Green Dark", value: "var(--green-600)", foreground: ON_LIGHT },
  { label: "Moss", value: "var(--moss-400)", foreground: ON_LIGHT },
  { label: "Teal", value: "var(--teal-400)", foreground: ON_LIGHT },
  { label: "Teal Dark", value: "var(--teal-600)", foreground: ON_LIGHT },
  { label: "Blue", value: "var(--blue-400)", foreground: ON_LIGHT },
  { label: "Blue Dark", value: "var(--blue-600)", foreground: ON_STRONG_HUE },
  { label: "Purple", value: "var(--purple-400)", foreground: ON_LIGHT },
  { label: "Purple Dark", value: "var(--purple-600)", foreground: ON_STRONG_HUE },
  { label: "Magenta", value: "var(--magenta-400)", foreground: ON_LIGHT },
  { label: "Red", value: "var(--red-400)", foreground: ON_LIGHT },
  { label: "Red Dark", value: "var(--red-600)", foreground: ON_STRONG_HUE },
];

/**
 * The hues of `COLOR_PALETTE` at another level of the same scale, one swatch per hue.
 *
 * The choice palette carries only the `-400` and `-600` levels, which suit an accent but not
 * marking or colouring text. Every hue's other levels already exist as tokens, so these rows
 * are derived from the choice palette rather than written out again — one hue vocabulary, no
 * second list to drift from it. A hue's dark variant collapses into its base, since both
 * resolve to the same derived token.
 */
function paletteAtLevel(level: number, foreground: string): readonly PaletteItem[] {
  return COLOR_PALETTE.reduce<PaletteItem[]>((acc, item) => {
    const hue = /^var\(--([a-z]+)-\d+\)$/.exec(item.value)?.[1];
    if (!hue) return acc;
    const value = `var(--${hue}-${level})`;
    // The light variant comes first in `COLOR_PALETTE`, so it is the label that survives.
    if (acc.some((c) => c.value === value)) return acc;
    acc.push({ value, ...(item.label && { label: item.label }), foreground });
    return acc;
  }, []);
}

/**
 * Marker colours: light enough to read dark text through. `-200` is the lightest level that
 * still reads as a deliberate highlight rather than a smudge.
 *
 * Dark mode keeps `-200` light enough for the same dark text, so a highlight reads as a lit
 * patch on a dark card. Dark text on the swatch: 10.2–12.4:1 in light, 6.4–7.8:1 in dark
 * (blue lowest, green highest); the dark swatch itself against the dark card: 5.5–6.6:1.
 */
export const HIGHLIGHT_PALETTE = paletteAtLevel(200, ON_LIGHT);

/**
 * Text colours: dark enough to read as body text on a light surface. `-700` rather than `-600`
 * because at `-600` five of the eleven hues fall below 4.5:1 against the editor surface, where
 * at `-700` only yellow (3.9:1) and green (4.1:1) do — close enough for a coloured span, and
 * both are the point of those hues. Pairing this dark-only row with the light-only
 * `HIGHLIGHT_PALETTE` is what keeps the two marks legible together: neither picker can offer
 * light-on-light or dark-on-dark.
 *
 * In dark mode `-700` is a light tint instead, so the row reads on the dark card: 7.0–7.1:1
 * for every hue, yellow and green included. The swatch foreground flips with it. Grey is the
 * exception: `--grey-700` stays fixed (1.8:1 on the dark card), so in dark mode a rule in
 * `globals.css` draws it as `--text-secondary` inside `.jf-rich-text` and on its picker swatch.
 * The stored value is untouched.
 */
export const TEXT_COLOR_PALETTE = paletteAtLevel(700, ON_STRONG_HUE);

/**
 * The foreground (text/icon) color to render on a given palette background. The token it
 * returns is right in both themes, so this needs no theme.
 */
export function getColorForeground(value: string): string {
  return COLOR_PALETTE.find((c) => c.value === value)?.foreground ?? ON_LIGHT;
}

/**
 * Whether a palette background is dark enough to require light foreground text in `theme`.
 * Prefer `getColorForeground` when only a colour is needed; this is for picking other styling
 * (hover fills, soft text) in JS, which has to know the theme.
 */
export function isDarkSurface(value: string, theme: ResolvedTheme = "light"): boolean {
  const foreground = getColorForeground(value);
  if (foreground === ON_STRONG_HUE) return theme === "light";
  return foreground === ON_DARK;
}

export type PaletteItem = { value: string; label?: string; foreground?: string };

/** Light text token, for use on dark-surfaced palette colors. */
const ON_DARK = "var(--grey-100)";
/** Default (dark) text token, for use on light-surfaced palette colors. */
const ON_LIGHT = "var(--grey-900)";

/**
 * The shared color-choice palette used by the fleet's accent/tag color pickers.
 * Dark variants (the `-600` tokens) sit immediately after their light counterpart.
 *
 * `foreground` is the recommended text/icon color to render *on* each background.
 * Note that the `-600` tokens are not uniformly dark in luminance: yellow and green
 * "dark" are mid-bright and still read best with dark text, so only blue/purple/red
 * dark carry a light foreground.
 */
export const COLOR_PALETTE: readonly PaletteItem[] = [
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
  { label: "Blue Dark", value: "var(--blue-600)", foreground: ON_DARK },
  { label: "Purple", value: "var(--purple-400)", foreground: ON_LIGHT },
  { label: "Purple Dark", value: "var(--purple-600)", foreground: ON_DARK },
  { label: "Magenta", value: "var(--magenta-400)", foreground: ON_LIGHT },
  { label: "Red", value: "var(--red-400)", foreground: ON_LIGHT },
  { label: "Red Dark", value: "var(--red-600)", foreground: ON_DARK },
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
 */
export const HIGHLIGHT_PALETTE = paletteAtLevel(200, ON_LIGHT);

/**
 * Text colours: dark enough to read as body text on a light surface. `-700` rather than `-600`
 * because at `-600` five of the eleven hues fall below 4.5:1 against the editor surface, where
 * at `-700` only yellow (3.9:1) and green (4.1:1) do — close enough for a coloured span, and
 * both are the point of those hues. Pairing this dark-only row with the light-only
 * `HIGHLIGHT_PALETTE` is what keeps the two marks legible together: neither picker can offer
 * light-on-light or dark-on-dark.
 */
export const TEXT_COLOR_PALETTE = paletteAtLevel(700, ON_DARK);

/** The foreground (text/icon) color to render on a given palette background. */
export function getColorForeground(value: string): string {
  return COLOR_PALETTE.find((c) => c.value === value)?.foreground ?? ON_LIGHT;
}

/** Whether a palette background is dark enough to require light foreground text. */
export function isDarkSurface(value: string): boolean {
  return getColorForeground(value) === ON_DARK;
}

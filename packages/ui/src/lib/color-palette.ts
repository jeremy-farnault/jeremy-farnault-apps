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
  { label: "Blue", value: "var(--blue-400)", foreground: ON_LIGHT },
  { label: "Blue Dark", value: "var(--blue-600)", foreground: ON_DARK },
  { label: "Purple", value: "var(--purple-400)", foreground: ON_LIGHT },
  { label: "Purple Dark", value: "var(--purple-600)", foreground: ON_DARK },
  { label: "Magenta", value: "var(--magenta-400)", foreground: ON_LIGHT },
  { label: "Red", value: "var(--red-400)", foreground: ON_LIGHT },
  { label: "Red Dark", value: "var(--red-600)", foreground: ON_DARK },
];

/** The foreground (text/icon) color to render on a given palette background. */
export function getColorForeground(value: string): string {
  return COLOR_PALETTE.find((c) => c.value === value)?.foreground ?? ON_LIGHT;
}

/** Whether a palette background is dark enough to require light foreground text. */
export function isDarkSurface(value: string): boolean {
  return getColorForeground(value) === ON_DARK;
}

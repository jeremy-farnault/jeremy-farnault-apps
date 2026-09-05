export type PaletteItem = { value: string; label?: string };

/**
 * The shared color-choice palette used by the fleet's accent/tag color pickers.
 * Dark variants (the `-600` tokens) sit immediately after their light counterpart.
 */
export const COLOR_PALETTE = [
  { label: "Grey", value: "var(--grey-200)" },
  { label: "Taupe", value: "var(--taupe-400)" },
  { label: "Beige", value: "var(--beige-400)" },
  { label: "Yellow", value: "var(--yellow-400)" },
  { label: "Yellow Dark", value: "var(--yellow-600)" },
  { label: "Green", value: "var(--green-400)" },
  { label: "Green Dark", value: "var(--green-600)" },
  { label: "Moss", value: "var(--moss-400)" },
  { label: "Teal", value: "var(--teal-400)" },
  { label: "Blue", value: "var(--blue-400)" },
  { label: "Blue Dark", value: "var(--blue-600)" },
  { label: "Purple", value: "var(--purple-400)" },
  { label: "Purple Dark", value: "var(--purple-600)" },
  { label: "Magenta", value: "var(--magenta-400)" },
  { label: "Red", value: "var(--red-400)" },
  { label: "Red Dark", value: "var(--red-600)" },
] as const;

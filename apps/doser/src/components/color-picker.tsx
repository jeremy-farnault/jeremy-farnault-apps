"use client";

import { ColorPicker as SharedColorPicker } from "@jf/ui";

const MEDICINE_COLOR_PALETTE = [
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
  { label: "Purple", value: "var(--purple-400)" },
  { label: "Magenta", value: "var(--magenta-400)" },
  { label: "Red", value: "var(--red-400)" },
  { label: "Red Dark", value: "var(--red-600)" },
] as const;

export const DEFAULT_PILL_TYPE_COLOR = "var(--yellow-600)";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return <SharedColorPicker palette={MEDICINE_COLOR_PALETTE} value={value} onChange={onChange} />;
}

"use client";

import { COLOR_PALETTE, ColorPicker as SharedColorPicker } from "@jf/ui";

export const DEFAULT_PILL_TYPE_COLOR = "var(--yellow-600)";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return <SharedColorPicker palette={COLOR_PALETTE} value={value} onChange={onChange} />;
}

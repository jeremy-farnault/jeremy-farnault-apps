"use client";

import { ColorPicker as BaseColorPicker, COLOR_PALETTE } from "@jf/ui";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return <BaseColorPicker palette={COLOR_PALETTE} value={value} onChange={onChange} />;
}

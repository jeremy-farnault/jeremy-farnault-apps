"use client";

import { COLOR_PALETTE } from "@/lib/note-utils";
import { ColorPicker as BaseColorPicker } from "@jf/ui";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return <BaseColorPicker palette={COLOR_PALETTE} value={value} onChange={onChange} />;
}

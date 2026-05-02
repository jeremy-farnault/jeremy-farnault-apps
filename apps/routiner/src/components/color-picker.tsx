"use client";

import React from "react";

const HABIT_COLOR_PALETTE = [
  { label: "Grey", value: "var(--grey-200)" },
  { label: "Taupe", value: "var(--taupe-400)" },
  { label: "Beige", value: "var(--beige-400)" },
  { label: "Yellow", value: "var(--yellow-400)" },
  { label: "Green", value: "var(--green-400)" },
  { label: "Moss", value: "var(--moss-400)" },
  { label: "Teal", value: "var(--teal-400)" },
  { label: "Blue", value: "var(--blue-400)" },
  { label: "Purple", value: "var(--purple-400)" },
  { label: "Magenta", value: "var(--magenta-400)" },
  { label: "Red", value: "var(--red-400)" },
] as const;

export const DEFAULT_HABIT_COLOR = "var(--yellow-400)";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {HABIT_COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: "50%",
            backgroundColor: c.value,
            border: value === c.value ? "2px solid #000" : "1px solid #ccc",
            cursor: "pointer",
          }}
        />
      ))}
    </div>
  );
}

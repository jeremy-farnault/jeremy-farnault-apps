"use client";

import React from "react";

type PaletteItem = { value: string; label?: string };

type Props = {
  palette: ReadonlyArray<PaletteItem>;
  value: string | null;
  onChange: (color: string) => void;
};

export function ColorPicker({ palette, value, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {palette.map((c) => (
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

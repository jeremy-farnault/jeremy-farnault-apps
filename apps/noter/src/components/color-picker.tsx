"use client";

import { COLOR_PALETTE } from "@/lib/note-utils";
import React from "react";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {COLOR_PALETTE.map((c) => (
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

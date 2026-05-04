"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m9.907 15.162 9.589-8.717 1.009 1.11-9.59 8.717a2.75 2.75 0 0 1-3.794-.09L3.47 12.53l1.06-1.06 3.652 3.651a1.25 1.25 0 0 0 1.725.041"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled, className }: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-1.5",
        disabled ? "cursor-default" : "cursor-pointer",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border transition-colors",
          "w-[18px] h-[18px]",
          checked
            ? "bg-(--primary) border-(--primary) text-white"
            : "bg-transparent border-(--grey-400)"
        )}
      >
        {checked && <CheckIcon />}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

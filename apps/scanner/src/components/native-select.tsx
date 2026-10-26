import { cn } from "@jf/ui";
import { CaretDownIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/**
 * The platform's own select (a native picker on phones), with the browser's arrow swapped
 * for a caret: the native one ignores the right padding and sits on the box's edge.
 */
export function NativeSelect({
  value,
  onChange,
  disabled = false,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  "aria-label"?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-flex items-center">
      <select
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none rounded-[10px] bg-(--surface-sunken) py-1.5 pr-7 pl-2 text-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-default disabled:opacity-50",
          className
        )}
      >
        {children}
      </select>
      <CaretDownIcon
        size={12}
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute right-2.5 text-(--text-muted)"
      />
    </span>
  );
}

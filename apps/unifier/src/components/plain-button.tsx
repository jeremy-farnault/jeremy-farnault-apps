"use client";

import { cn } from "@jf/ui";
import type { ComponentProps } from "react";

/**
 * The quiet action style: a subtle surface that darkens on hover, for actions that
 * shouldn't compete with the primary ones sitting next to them.
 */
export function PlainButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-sm",
        "bg-(--surface-150) text-(--grey-700) transition-colors",
        "hover:bg-(--surface-200) hover:text-(--grey-900)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

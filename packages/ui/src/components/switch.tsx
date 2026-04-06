"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "../lib/utils";

interface SwitchProps extends SwitchPrimitive.SwitchProps {
  label?: ReactNode;
}

export function Switch({ label, className, ...props }: SwitchProps) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2">
      <SwitchPrimitive.Root
        id={id}
        className={cn(
          "relative inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-full",
          "bg-(--surface-200) data-[state=checked]:bg-(--primary)",
          "focus-visible:outline-none focus-visible:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-none",
            "translate-x-[3px] data-[state=checked]:translate-x-[21px]"
          )}
        />
      </SwitchPrimitive.Root>
      {label && <span className="text-sm text-(--foreground)">{label}</span>}
    </label>
  );
}

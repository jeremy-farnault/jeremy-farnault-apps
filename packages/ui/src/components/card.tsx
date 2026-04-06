import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface CardProps {
  children: ReactNode;
  emphasized?: boolean;
  className?: string;
}

export function Card({ children, emphasized = false, className }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start self-stretch rounded-[22px] p-8 gap-6 bg-(--surface-100)",
        emphasized && "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

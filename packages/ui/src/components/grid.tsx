import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface GridProps {
  children: ReactNode;
  className?: string;
  startCols?: 1 | 2;
}

export function Grid({ children, className, startCols = 1 }: GridProps) {
  const colClass =
    startCols === 2
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  return <div className={cn("grid gap-4", colClass, className)}>{children}</div>;
}

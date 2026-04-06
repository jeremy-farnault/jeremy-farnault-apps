import { cn } from "../lib/utils";

interface SkeletonProps {
  height: number | string;
  width?: number | string;
  amount?: number;
  className?: string;
}

export function Skeleton({ height, width = "100%", amount = 1, className }: SkeletonProps) {
  const item = (
    <div
      className={cn("animate-pulse rounded-[22px] bg-(--muted)", className)}
      style={{ height, width }}
    />
  );

  if (amount === 1) return item;

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: amount }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          key={i}
          className={cn("animate-pulse rounded-[22px] bg-(--muted)", className)}
          style={{ height, width }}
        />
      ))}
    </div>
  );
}

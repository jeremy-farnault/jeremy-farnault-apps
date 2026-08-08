"use client";

import { cn } from "@jf/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type OverviewSub = "global" | "spending" | "assets" | "income";

interface OverviewSubToggleProps {
  sub: OverviewSub;
}

export function OverviewSubToggle({ sub }: OverviewSubToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSub(v: OverviewSub) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sub", v);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-[12px] p-1 bg-(--surface-150) self-start">
      {(["global", "spending", "assets", "income"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setSub(v)}
          className={cn(
            "h-9 px-4 rounded-[10px] text-sm font-medium capitalize transition-colors",
            sub === v ? "bg-(--primary) text-white" : "text-(--grey-700) hover:bg-(--surface-200)"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

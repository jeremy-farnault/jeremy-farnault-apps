"use client";

import { cn } from "@jf/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface ViewToggleProps {
  view: "spending" | "savings";
}

export function ViewToggle({ view }: ViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(v: "spending" | "savings") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex rounded-[12px] p-1 bg-(--surface-150) self-start">
      {(["spending", "savings"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            "h-9 px-4 rounded-[10px] text-sm font-medium capitalize transition-colors",
            view === v ? "bg-(--primary) text-white" : "text-(--grey-700) hover:bg-(--surface-200)"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

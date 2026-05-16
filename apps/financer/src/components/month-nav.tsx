"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface MonthNavProps {
  month: string; // YYYY-MM
}

function shiftMonth(month: string, delta: number): string {
  const parts = month.split("-");
  const year = Number(parts[0]);
  const m = Number(parts[1]);
  const date = new Date(year, m - 1 + delta, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function MonthNav({ month }: MonthNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(delta: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", shiftMonth(month, delta));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200) transition-colors"
        aria-label="Previous month"
      >
        <ArrowLeftIcon size={16} />
      </button>
      <span className="text-sm font-medium text-(--grey-900) min-w-[120px] text-center">
        {formatMonth(month)}
      </span>
      <button
        type="button"
        onClick={() => navigate(1)}
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200) transition-colors"
        aria-label="Next month"
      >
        <ArrowRightIcon size={16} />
      </button>
    </div>
  );
}

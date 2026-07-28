"use client";

import { addMonths, formatMonthLabel } from "@/lib/cycle";
import { cn } from "@jf/ui";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
};

export function MonthNav({ year, month, currentYear, currentMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCurrentMonth = year === currentYear && month === currentMonth;

  function navigateTo(nextYear: number, nextMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", `${nextYear}-${String(nextMonth).padStart(2, "0")}`);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function navigate(delta: number) {
    const next = addMonths(year, month, delta);
    navigateTo(next.year, next.month);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Previous month"
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) transition-colors hover:bg-(--surface-200)"
      >
        <ArrowLeftIcon size={16} />
      </button>

      <span className="min-w-[120px] text-center text-sm font-medium text-(--grey-900)">
        {formatMonthLabel(year, month)}
      </span>

      <button
        type="button"
        onClick={() => navigate(1)}
        aria-label="Next month"
        className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-(--surface-150) text-(--grey-700) transition-colors hover:bg-(--surface-200)"
      >
        <ArrowRightIcon size={16} />
      </button>

      <button
        type="button"
        onClick={() => navigateTo(currentYear, currentMonth)}
        disabled={isCurrentMonth}
        aria-label="Go to current month"
        className={cn(
          "rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
          isCurrentMonth
            ? "cursor-default text-(--grey-400)"
            : "text-(--grey-700) hover:bg-(--surface-150)"
        )}
      >
        Today
      </button>
    </div>
  );
}

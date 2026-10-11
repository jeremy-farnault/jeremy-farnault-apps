"use client";

import type { CalendarScope } from "@/lib/queries";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Props = { scope: CalendarScope };

export function CalendarBreadcrumb({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigateTo(partial: {
    year: number;
    month?: number | undefined;
    day?: number | undefined;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("year");
    params.delete("month");
    params.delete("day");
    params.set("year", String(partial.year));
    if (partial.month !== undefined) params.set("month", String(partial.month));
    if (partial.day !== undefined) params.set("day", String(partial.day));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-(--text-secondary)">
      <button
        type="button"
        onClick={() => navigateTo({ year: scope.year })}
        className="hover:text-(--text) transition-colors font-medium"
      >
        {scope.year}
      </button>

      {scope.month !== undefined && (
        <>
          <span className="text-(--border-strong)">›</span>
          <button
            type="button"
            onClick={() => navigateTo({ year: scope.year, month: scope.month })}
            className="hover:text-(--text) transition-colors"
          >
            {MONTH_NAMES[scope.month - 1]}
          </button>
        </>
      )}

      {scope.day !== undefined && (
        <>
          <span className="text-(--border-strong)">›</span>
          <span className="text-(--text)">{scope.day}</span>
        </>
      )}
    </div>
  );
}

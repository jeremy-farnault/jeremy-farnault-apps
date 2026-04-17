"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CalendarScope } from "@/lib/queries";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = { scope: CalendarScope };

export function CalendarBreadcrumb({ scope }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigateTo(partial: { year: number; month?: number; day?: number }) {
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
    <div className="flex items-center gap-1.5 mb-4 text-sm text-(--grey-600)">
      <button
        type="button"
        onClick={() => navigateTo({ year: scope.year })}
        className="hover:text-(--grey-900) transition-colors font-medium"
      >
        {scope.year}
      </button>

      {scope.month !== undefined && (
        <>
          <span className="text-(--grey-300)">›</span>
          <button
            type="button"
            onClick={() => navigateTo({ year: scope.year, month: scope.month! })}
            className="hover:text-(--grey-900) transition-colors"
          >
            {MONTH_NAMES[scope.month - 1]}
          </button>
        </>
      )}

      {scope.day !== undefined && (
        <>
          <span className="text-(--grey-300)">›</span>
          <span className="text-(--grey-900)">{scope.day}</span>
        </>
      )}
    </div>
  );
}

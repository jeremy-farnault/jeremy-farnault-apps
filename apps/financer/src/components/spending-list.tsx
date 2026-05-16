import type { SpendingRow } from "@/lib/queries";

interface SpendingListProps {
  data: SpendingRow[];
}

export function SpendingList({ data }: SpendingListProps) {
  if (data.length === 0) {
    return <p className="text-sm text-(--grey-500)">No spending logged for this month.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map(({ category, total }) => (
        <li
          key={category}
          className="flex items-center justify-between rounded-[12px] bg-(--surface-100) px-4 py-3"
        >
          <span className="text-sm font-medium text-(--grey-900)">{category}</span>
          <span className="text-sm font-semibold text-(--grey-900)">
            {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </li>
      ))}
    </ul>
  );
}

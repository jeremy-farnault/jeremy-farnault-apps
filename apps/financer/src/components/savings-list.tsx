import type { SavingsRow } from "@/lib/queries";

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SavingsList({
  data,
  homeCurrency,
  rates,
}: {
  data: SavingsRow[];
  homeCurrency: string;
  rates: Record<string, number>;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-(--grey-500)">No savings logged for this month.</p>;
  }

  const currencyTotals = new Map<string, number>();
  for (const row of data) {
    currencyTotals.set(row.currency, (currencyTotals.get(row.currency) ?? 0) + row.total);
  }
  const sortedCurrencies = Array.from(currencyTotals.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const grandTotal = data.reduce((sum, row) => {
    const rateFrom = rates[row.currency] ?? 1;
    const rateTo = rates[homeCurrency] ?? 1;
    return sum + row.total * (rateTo / rateFrom);
  }, 0);

  const showGrandTotal = Object.keys(rates).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {data.map(({ sourceId, name, currency, total }) => (
          <li
            key={sourceId}
            className="flex items-center justify-between rounded-[12px] bg-(--surface-100) px-4 py-3"
          >
            <span className="text-sm font-medium text-(--grey-900)">{name}</span>
            <span className="text-sm font-semibold text-(--grey-900)">
              {currency} {formatAmount(total)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-(--border) pt-3">
        {sortedCurrencies.map(([currency, total]) => (
          <div key={currency} className="flex justify-between text-sm">
            <span className="text-(--grey-500)">Total {currency}</span>
            <span className="font-semibold text-(--grey-900)">
              {currency} {formatAmount(total)}
            </span>
          </div>
        ))}
        {showGrandTotal && (
          <div className="flex justify-between pt-2 text-sm font-semibold text-(--grey-900)">
            <span>Total</span>
            <span>
              ≈ {homeCurrency} {formatAmount(grandTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

import { formatAgo, formatPrice, formatShortDate, storeLabel } from "@/lib/format";
import type { ItemSummary } from "@/lib/summary";
import { cn } from "@jf/ui";
import { CircleNotchIcon, ImageIcon } from "@phosphor-icons/react";

type Props = {
  item: ItemSummary;
  homeCurrency: string;
  /** One of the item's links is being checked right now. */
  checking?: boolean;
};

/**
 * One wishlist item, showing where it's cheapest right now: the price in that store's
 * currency (what you'd pay), your home currency beside it for comparison, and the sale
 * when there is one. With nothing buyable, the last known price shows greyed out.
 */
export function ItemListRow({ item, homeCurrency, checking = false }: Props) {
  const lowest = item.lowest;
  const check = lowest?.latest;
  const muted = lowest?.unavailable ?? false;

  return (
    <div className="card-raised flex items-center gap-4 rounded-2xl bg-(--surface-100) p-3 surface-blur">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-(--surface-sunken) text-(--text-subtle)"
        aria-hidden
      >
        <ImageIcon size={24} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-(--text)">{item.name}</p>
        {lowest && (
          <p className="truncate text-xs text-(--text-muted)">
            {storeLabel(lowest.store, lowest.url)}
            {lowest.region ? ` · ${lowest.region}` : ""}
            {muted && (lowest.stale ? " · check failed" : " · out of stock")}
          </p>
        )}
        {lowest && (
          <p className="truncate text-xs text-(--text-subtle)">
            {checking ? (
              <span className="inline-flex items-center gap-1">
                <CircleNotchIcon size={12} className="animate-spin" aria-hidden />
                Checking…
              </span>
            ) : lowest.stale && lowest.latest ? (
              `Last worked ${formatAgo(lowest.latest.checkedAt)}`
            ) : (
              `Checked ${formatAgo(lowest.lastCheckedAt)}`
            )}
          </p>
        )}
        {!muted && check?.discountPercent ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-(--text-muted)">
            <span className="vivid rounded-md bg-(--primary) px-1.5 py-0.5 font-semibold text-(--primary-foreground)">
              −{check.discountPercent}%
            </span>
            {check.saleEndsAt && <span>ends {formatShortDate(check.saleEndsAt)}</span>}
          </p>
        ) : null}
      </div>

      {lowest ? (
        <div className={cn("shrink-0 text-right", muted && "opacity-50")}>
          <p className="font-semibold text-(--text)">
            {formatPrice(lowest.current.price, lowest.current.currency)}
          </p>
          {lowest.current.currency !== homeCurrency && lowest.current.converted !== null && (
            <p className="text-xs text-(--text-muted)">
              ≈ {formatPrice(lowest.current.converted, homeCurrency, { round: true })}
            </p>
          )}
        </div>
      ) : (
        <p className="shrink-0 text-xs text-(--text-subtle)">No price yet</p>
      )}
    </div>
  );
}

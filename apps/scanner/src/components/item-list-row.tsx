import { formatPrice, formatShortDate, storeLabel } from "@/lib/format";
import type { ItemSummary } from "@/lib/summary";
import { cn } from "@jf/ui";
import { CircleNotchIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { ItemImage } from "./item-image";

type Props = {
  item: ItemSummary;
  homeCurrency: string;
  /** One of the item's links is being checked right now. */
  checking?: boolean;
};

/**
 * One wishlist item, showing where it's cheapest right now: the price in that store's
 * currency (what you'd pay), your home currency beside it for comparison, and the sale
 * when there is one. With nothing buyable, the last known price shows greyed out. The
 * item's other buyable links follow on one line, in the home currency so they compare
 * at a glance.
 */
export function ItemListRow({ item, homeCurrency, checking = false }: Props) {
  const lowest = item.lowest;
  const check = lowest?.latest;
  const muted = lowest?.unavailable ?? false;
  const others = item.links
    .filter((l) => l.eligible && l.id !== lowest?.id)
    .sort((a, b) => (a.current?.converted ?? 0) - (b.current?.converted ?? 0));

  return (
    <Link
      href={`/items/${item.id}`}
      className="card-raised flex h-[96px] overflow-hidden rounded-2xl bg-(--surface-100) surface-blur transition-transform hover:-translate-y-0.5"
    >
      <ItemImage url={item.imageUrl} size="card" />

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-2">
        <p className="truncate text-sm font-semibold text-(--text)">{item.name}</p>

        {lowest ? (
          <>
            <p className={cn("flex min-w-0 items-baseline gap-2", muted && "opacity-50")}>
              <span className="shrink-0 font-semibold text-(--text)">
                {formatPrice(lowest.current.price, lowest.current.currency)}
              </span>
              {lowest.current.currency !== homeCurrency && lowest.current.converted !== null && (
                <span className="truncate text-xs text-(--text-muted)">
                  ≈ {formatPrice(lowest.current.converted, homeCurrency, { round: true })}
                </span>
              )}
              {!muted && check?.discountPercent ? (
                <span className="vivid shrink-0 self-center rounded-md bg-(--primary) px-1.5 py-0.5 text-xs font-semibold text-(--primary-foreground)">
                  −{check.discountPercent}%
                </span>
              ) : null}
            </p>
            <p className="flex min-w-0 items-center gap-1 text-xs text-(--text-muted)">
              {checking && (
                <CircleNotchIcon
                  size={12}
                  className="shrink-0 animate-spin"
                  aria-label="Checking"
                />
              )}
              <span className="truncate">
                {storeLabel(lowest.store, lowest.url)}
                {lowest.region ? ` · ${lowest.region}` : ""}
                {muted && (lowest.stale ? " · check failed" : " · out of stock")}
                {!muted && check?.discountPercent && check.saleEndsAt
                  ? ` · ends ${formatShortDate(check.saleEndsAt)}`
                  : ""}
              </span>
            </p>
            {others.length > 0 && (
              <p className="truncate text-xs text-(--text-subtle)">
                {others
                  .map(
                    (l) =>
                      `${storeLabel(l.store, l.url)}${l.region ? ` ${l.region}` : ""} ${formatPrice(
                        l.current?.converted ?? 0,
                        homeCurrency,
                        { round: true }
                      )}`
                  )
                  .join(" · ")}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-(--text-subtle)">No price yet</p>
        )}
      </div>
    </Link>
  );
}

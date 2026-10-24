import { formatPrice, storeLabel } from "@/lib/format";
import type { ItemRow } from "@/lib/queries";
import { ImageIcon } from "@phosphor-icons/react";

/**
 * One wishlist item: name, store and the price of its first link, in the store's currency.
 * Comparing links and converting currencies arrives with the item summary (ticket 08).
 */
export function ItemListRow({ item }: { item: ItemRow }) {
  const link = item.links[0];
  const price = link?.latest;
  const current = price ? (price.salePrice ?? price.normalPrice) : null;

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
        {link && (
          <p className="truncate text-xs text-(--text-muted)">
            {storeLabel(link.store, link.url)}
            {link.region ? ` · ${link.region}` : ""}
          </p>
        )}
      </div>
      {price && current !== null && (
        <p
          className={
            price.inStock ? "font-semibold text-(--text)" : "font-semibold text-(--text-subtle)"
          }
        >
          {formatPrice(current, price.currency)}
        </p>
      )}
    </div>
  );
}

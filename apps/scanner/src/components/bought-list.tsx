"use client";

import { moveToWishlistAction } from "@/lib/actions";
import { formatPrice, formatShortDate } from "@/lib/format";
import type { BoughtRow } from "@/lib/queries";
import { Tooltip } from "@jf/ui";
import { ArrowCounterClockwiseIcon, ArrowLeftIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ItemImage } from "./item-image";

/** What you bought, newest first: like Classer's archive, with a way back to the wishlist. */
export function BoughtList({ items }: { items: BoughtRow[] }) {
  const router = useRouter();
  const [moving, setMoving] = useState<string | null>(null);

  async function moveBack(item: BoughtRow) {
    setMoving(item.id);
    try {
      await moveToWishlistAction({ itemId: item.id });
      toast.success(`${item.name} is back on your wishlist`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setMoving(null);
    }
  }

  return (
    <main className="flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-16 pt-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 self-start text-sm text-(--text-secondary) transition-colors hover:text-(--text)"
      >
        <ArrowLeftIcon size={16} /> Wishlist
      </Link>
      <h1 className="text-2xl font-semibold text-(--text)">Bought</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <ShoppingBagIcon size={48} className="text-(--primary)" weight="duotone" />
          <p className="max-w-sm text-sm text-(--text-secondary)">
            Nothing yet. When you buy something on your wishlist, mark it as bought from its page
            and it lands here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="card-raised flex items-center gap-4 rounded-2xl bg-(--surface-100) p-3 surface-blur"
            >
              <Link href={`/items/${item.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <ItemImage url={item.imageUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-(--text)">{item.name}</p>
                  <p className="truncate text-xs text-(--text-muted)">
                    {item.store}
                    {item.boughtAt && ` · ${formatShortDate(item.boughtAt)}`}
                  </p>
                </div>
                {item.price !== null && item.currency && (
                  <p className="shrink-0 font-semibold text-(--text)">
                    {formatPrice(item.price, item.currency)}
                  </p>
                )}
              </Link>
              <Tooltip content="Move back to wishlist">
                <button
                  type="button"
                  onClick={() => void moveBack(item)}
                  disabled={moving === item.id}
                  aria-label={`Move ${item.name} back to wishlist`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-(--text-subtle) transition-[color,background-color] hover:bg-(--surface-150) hover:text-(--text) disabled:opacity-50"
                >
                  <ArrowCounterClockwiseIcon size={16} />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

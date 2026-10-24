"use client";

import { type ItemSummary, SORT_OPTIONS, type SortOption } from "@/lib/summary";
import { Button, FloatingCTA, Select, SelectItem } from "@jf/ui";
import { BarcodeIcon, PlusIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AddItemModal } from "./add-item-modal";
import { ItemListRow } from "./item-list-row";

type Props = { items: ItemSummary[]; homeCurrency: string; sort: SortOption };

export function WishlistClient({ items, homeCurrency, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adding, setAdding] = useState(false);

  // The sort lives in the URL, as in Classer, so a reload or a shared link keeps it.
  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex w-full max-w-3xl flex-1 flex-col px-4 pb-32 pt-4">
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <BarcodeIcon size={48} className="text-(--primary)" weight="duotone" />
          <h2 className="text-xl font-semibold text-(--text)">Your wishlist is empty</h2>
          <p className="max-w-sm text-sm leading-relaxed text-(--text-secondary)">
            Paste a link to a product page, from any shop, and Scanner keeps an eye on its price.
          </p>
          <Button onClick={() => setAdding(true)} className="mt-2">
            Paste a link
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Select value={sort} onValueChange={handleSortChange} className="w-[200px]">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <ItemListRow item={item} homeCurrency={homeCurrency} />
              </li>
            ))}
          </ul>
        </>
      )}

      {items.length > 0 && (
        <FloatingCTA
          label="Add"
          icon={<PlusIcon size={20} weight="bold" />}
          onClick={() => setAdding(true)}
        />
      )}

      <AddItemModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}

"use client";

import type { ItemRow } from "@/lib/queries";
import { Button, FloatingCTA } from "@jf/ui";
import { BarcodeIcon, PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddItemModal } from "./add-item-modal";
import { ItemListRow } from "./item-list-row";

export function WishlistClient({ items }: { items: ItemRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

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
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <ItemListRow item={item} />
            </li>
          ))}
        </ul>
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

"use client";

import { Breadcrumb } from "@/components/breadcrumb";
import { ItemCard } from "@/components/item-card";
import type { ItemCardData } from "@/components/item-card";
import { FloatingCTA } from "@jf/ui";
import { PlusIcon } from "@phosphor-icons/react";

type ClasserProps = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};
type Props = { classer: ClasserProps; items: ItemCardData[] };

export function ClasserDetailClient({ classer, items }: Props) {
  return (
    <>
      <main className="w-full px-4 pt-6 pb-24">
        <Breadcrumb crumbs={[{ label: classer.name }]} />

        <header className="mb-6">
          {classer.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={classer.imageUrl}
              alt={classer.name}
              className="mb-4 h-48 w-full rounded-[22px] object-cover"
            />
          )}
          <h1 className="text-2xl font-bold text-(--grey-900)">{classer.name}</h1>
          {classer.description && (
            <p className="mt-1 text-sm text-(--grey-600)">{classer.description}</p>
          )}
        </header>

        {items.length === 0 ? (
          <div className="flex justify-center pt-16">
            <p className="text-sm text-(--grey-500)">Nothing here yet.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                totalCount={items.length}
                onUp={() => {}}
                onDown={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </ol>
        )}
      </main>

      {/* onClick no-op — ticket 09 wires the create-item modal */}
      <FloatingCTA icon={<PlusIcon size={22} />} onClick={() => {}} />
    </>
  );
}

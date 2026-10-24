"use client";

import { requestCheck } from "@/lib/check-client";
import type { CheckedLink } from "@/lib/check-link";
import { createCheckQueue } from "@/lib/check-queue";
import type { ItemRow } from "@/lib/queries";
import {
  SORT_OPTIONS,
  type SortOption,
  needsRecheck,
  sortItems,
  summarizeItem,
} from "@/lib/summary";
import { useOnline } from "@/lib/use-online";
import { Button, FloatingCTA, Select, SelectItem, cn } from "@jf/ui";
import { ArrowsClockwiseIcon, BarcodeIcon, PlusIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddItemModal } from "./add-item-modal";
import { ItemListRow } from "./item-list-row";

type Props = {
  items: ItemRow[];
  rates: Record<string, number>;
  homeCurrency: string;
  sort: SortOption;
};

/** The store a link's requests go to, so the queue can keep to one at a time per store. */
function storeKey(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function WishlistClient({ items, rates, homeCurrency, sort }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adding, setAdding] = useState(false);
  const online = useOnline();

  // Fresh results per link, laid over the server's data until the next refresh replaces it.
  const [checked, setChecked] = useState<Map<string, CheckedLink>>(new Map());
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const anyResult = useRef(false);

  const queue = useMemo(
    () =>
      createCheckQueue<CheckedLink | null>({
        check: requestCheck,
        onResult: (linkId, result) => {
          if (result) {
            anyResult.current = true;
            setChecked((prev) => new Map(prev).set(linkId, result));
          }
          setChecking((prev) => {
            const next = new Set(prev);
            next.delete(linkId);
            return next;
          });
        },
      }),
    []
  );

  function enqueue(links: { id: string; url: string }[]) {
    const fresh = links.filter((l) => !queue.has(l.id));
    if (fresh.length === 0) return;
    setChecking((prev) => new Set([...prev, ...fresh.map((l) => l.id)]));
    queue.add(fresh.map((l) => ({ linkId: l.id, store: storeKey(l.url) })));
    // Re-sort once everything settles, so rows don't jump around while results come in.
    void queue.whenIdle().then(() => {
      if (anyResult.current) {
        anyResult.current = false;
        router.refresh();
      }
    });
  }

  const allLinks = useMemo(() => items.flatMap((i) => i.links), [items]);

  // New server data (after a refresh or an add) replaces the overlay.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the server data only.
  useEffect(() => {
    setChecked(new Map());
  }, [allLinks]);

  // Opening the page rechecks whatever is more than an hour old, and so does coming back
  // online. Offline, the saved prices are all there is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per payload and on reconnect.
  useEffect(() => {
    if (!online) return;
    const now = new Date();
    enqueue(allLinks.filter((l) => needsRecheck(l, now)));
  }, [allLinks, online]);

  // The order comes from the server's data, so it only changes on refresh.
  const order = useMemo(
    () =>
      sortItems(
        items.map((i) => summarizeItem(i, rates, homeCurrency)),
        sort
      ).map((s) => s.id),
    [items, rates, homeCurrency, sort]
  );
  const summaries = useMemo(() => {
    const byId = new Map(
      items.map((item) => [
        item.id,
        summarizeItem(
          { ...item, links: item.links.map((l) => ({ ...l, ...checked.get(l.id) })) },
          rates,
          homeCurrency
        ),
      ])
    );
    return order.flatMap((id) => byId.get(id) ?? []);
  }, [items, checked, order, rates, homeCurrency]);

  // The sort lives in the URL, as in Classer, so a reload or a shared link keeps it.
  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const busy = checking.size > 0;

  return (
    <div className="flex w-full max-w-3xl flex-1 flex-col px-4 pb-32 pt-4">
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <BarcodeIcon size={48} className="text-(--primary)" weight="duotone" />
          <h2 className="text-xl font-semibold text-(--text)">Your wishlist is empty</h2>
          <p className="max-w-sm text-sm leading-relaxed text-(--text-secondary)">
            Paste a link to a product page, from any shop, and Scanner keeps an eye on its price.
          </p>
          <Button onClick={() => setAdding(true)} disabled={!online} className="mt-2">
            Paste a link
          </Button>
          <Link href="/bought" className="text-sm text-(--text-muted) underline">
            See what you bought
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => enqueue(allLinks)}
              disabled={busy || !online}
              className="gap-2"
            >
              <ArrowsClockwiseIcon size={18} className={cn(busy && "animate-spin")} />
              {busy ? `Checking ${checking.size}…` : "Check all"}
            </Button>
            <Link
              href="/bought"
              className="ml-auto flex items-center gap-1.5 text-sm text-(--text-secondary) transition-colors hover:text-(--text)"
            >
              <ShoppingBagIcon size={16} /> Bought
            </Link>
            <Select value={sort} onValueChange={handleSortChange} className="w-[200px]">
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          {!online && (
            <output className="mb-3 block text-sm text-(--text-muted)">
              You're offline: these are the last saved prices. Checking resumes when you're back
              online.
            </output>
          )}
          <ul className="flex flex-col gap-3">
            {summaries.map((item) => (
              <li key={item.id}>
                <ItemListRow
                  item={item}
                  homeCurrency={homeCurrency}
                  checking={item.links.some((l) => checking.has(l.id))}
                />
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
          disabled={!online}
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

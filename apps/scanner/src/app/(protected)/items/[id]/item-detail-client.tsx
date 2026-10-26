"use client";

import { AddItemModal } from "@/components/add-item-modal";
import { DiscoveryPanel } from "@/components/discovery-panel";
import { ItemImage } from "@/components/item-image";
import {
  deleteItemAction,
  markBoughtAction,
  moveToWishlistAction,
  presignImageUploadAction,
  removeLinkAction,
  renameItemAction,
  setItemImageAction,
} from "@/lib/actions";
import { formatAgo, formatPrice, formatShortDate, storeLabel } from "@/lib/format";
import { uploadItemImage } from "@/lib/item-image";
import { SEARCHABLE_STORES, STEAM_REGIONS, type Store } from "@/lib/price-reader";
import { minorDigits, toMinorUnits } from "@/lib/price-reader/money";
import { PS_REGIONS } from "@/lib/price-reader/ps-store";
import type { ItemDetail } from "@/lib/queries";
import {
  type ItemSummary,
  type LinkSummary,
  convert,
  offeredStores,
  summarizeItem,
} from "@/lib/summary";
import { useOnline } from "@/lib/use-online";
import { ActionModal, Button, FloatingCTA, TextInput, cn } from "@jf/ui";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  item: ItemDetail;
  rates: Record<string, number>;
  homeCurrency: string;
  /** Every store and region the user has links in. */
  userStores: { store: string; region: string | null }[];
  /** Open the search in other stores straight away (after adding a new item). */
  discover: boolean;
};

type DetailLink = ItemDetail["links"][number];

export function ItemDetailClient({ item, rates, homeCurrency, userStores, discover }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const summary = summarizeItem(item, rates, homeCurrency);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<DetailLink | null>(null);
  const [changingImage, setChangingImage] = useState(false);
  const [buying, setBuying] = useState(false);
  const online = useOnline();
  const [discovering, setDiscovering] = useState(discover && !item.bought);

  // The flag has done its job once the panel is open; a reload shouldn't reopen it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on arrival.
  useEffect(() => {
    if (discover) router.replace(pathname, { scroll: false });
  }, []);

  // Other PS regions are found through the item's PS link, so only an item with one can
  // look in them; stores that search by name can always be looked in.
  const hasPsLink = item.links.some((l) => l.store === "ps-store");
  const canFind = (store: string) =>
    (store === "ps-store" && hasPsLink) || SEARCHABLE_STORES.includes(store as Store);
  const offered = offeredStores(userStores, item.links, canFind);
  const free = (store: string, region: string) =>
    !item.links.some((l) => l.store === store && l.region === region) &&
    !offered.some((o) => o.store === store && o.region === region);
  const others = [
    ...(canFind("ps-store") ? PS_REGIONS : []).map((r) => ({
      store: "ps-store",
      region: r.region,
      label: `PS Store · ${r.label}`,
    })),
    ...(canFind("steam") ? STEAM_REGIONS : []).map((r) => ({
      store: "steam",
      region: r.region,
      label: `Steam · ${r.label}`,
    })),
  ].filter((o) => free(o.store, o.region));

  const linkSummaries = new Map(summary.links.map((l) => [l.id, l]));

  return (
    <main className="flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-32 pt-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 self-start text-sm text-(--text-secondary) transition-colors hover:text-(--text)"
      >
        <ArrowLeftIcon size={16} /> Wishlist
      </Link>

      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setChangingImage(true)}
          aria-label={item.imageUrl ? "Change image" : "Add an image"}
          className="rounded-xl transition-opacity hover:opacity-80"
        >
          <ItemImage url={item.imageUrl} size="lg" />
        </button>
        <h1 className="min-w-0 flex-1 break-words text-2xl font-semibold text-(--text)">
          {item.name}
        </h1>
        <IconButton label={`Rename ${item.name}`} onClick={() => setRenaming(true)}>
          <PencilSimpleIcon size={16} />
        </IconButton>
        <IconButton label={`Delete ${item.name}`} onClick={() => setDeleting(true)}>
          <TrashIcon size={16} />
        </IconButton>
      </header>

      {item.bought ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--surface-sunken) px-4 py-3">
          <p className="text-sm text-(--text)">
            Bought for{" "}
            <span className="font-semibold">
              {formatPrice(item.bought.price, item.bought.currency)}
            </span>{" "}
            at {item.bought.store}, {formatShortDate(item.bought.at)}
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void moveToWishlistAction({ itemId: item.id }).then(
                () => router.refresh(),
                () => toast.error("Something went wrong. Try again.")
              )
            }
          >
            Move back to wishlist
          </Button>
        </section>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setBuying(true)} disabled={!online} className="gap-2">
            <ShoppingBagIcon size={18} /> Mark as bought
          </Button>
          {!discovering && (
            <Button
              variant="outline"
              onClick={() => setDiscovering(true)}
              disabled={!online}
              className="gap-2"
            >
              <MagnifyingGlassIcon size={18} /> Find in other stores
            </Button>
          )}
        </div>
      )}

      {discovering && !item.bought && (
        <DiscoveryPanel
          item={{ id: item.id, name: item.name }}
          offered={offered}
          others={others}
          online={online}
          onClose={() => setDiscovering(false)}
          onAdded={() => router.refresh()}
        />
      )}

      <ul className="flex flex-col gap-3">
        {item.links.map((link) => {
          const s = linkSummaries.get(link.id);
          return (
            s && (
              <li key={link.id}>
                <LinkCard
                  link={link}
                  summary={s}
                  lowest={summary.lowest?.id === link.id && !summary.lowest.unavailable}
                  rates={rates}
                  homeCurrency={homeCurrency}
                  onRemove={() => setRemoving(link)}
                />
              </li>
            )
          );
        })}
      </ul>

      {!item.bought && (
        <FloatingCTA
          label="Add link"
          icon={<PlusIcon size={20} weight="bold" />}
          onClick={() => setAdding(true)}
          disabled={!online}
        />
      )}

      <MarkBoughtModal
        isOpen={buying}
        onClose={() => setBuying(false)}
        name={item.name}
        lowest={summary.lowest}
        currencies={[
          ...new Set([
            homeCurrency,
            ...summary.links.flatMap((l) => (l.current ? [l.current.currency] : [])),
          ]),
        ]}
        shops={[
          ...new Set(
            item.links.map(
              (l) => `${storeLabel(l.store, l.url)}${l.region ? ` · ${l.region}` : ""}`
            )
          ),
        ]}
        onSave={async (input) => {
          const result = await markBoughtAction({ itemId: item.id, ...input });
          if (!result.ok) throw new Error(result.message);
          toast.success(`${item.name} moved to Bought`);
          router.push("/");
        }}
      />

      <AddItemModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        onAdded={() => router.refresh()}
        item={{ id: item.id, name: item.name }}
      />
      <ImageModal
        isOpen={changingImage}
        onClose={() => setChangingImage(false)}
        currentUrl={item.imageUrl}
        onSave={async (file) => {
          const key = file ? await uploadItemImage(file, presignImageUploadAction) : null;
          await setItemImageAction({ itemId: item.id, key });
          router.refresh();
        }}
      />
      <RenameModal
        isOpen={renaming}
        onClose={() => setRenaming(false)}
        name={item.name}
        onSave={async (name) => {
          await renameItemAction({ itemId: item.id, name });
          router.refresh();
        }}
      />
      <DeleteItemModal
        isOpen={deleting}
        onClose={() => setDeleting(false)}
        name={item.name}
        reason="all"
        onConfirm={async () => {
          await deleteItemAction({ itemId: item.id });
          router.push("/");
        }}
      />
      {removing && item.links.length <= 1 ? (
        <DeleteItemModal
          isOpen
          onClose={() => setRemoving(null)}
          name={item.name}
          reason="last-link"
          onConfirm={async () => {
            await deleteItemAction({ itemId: item.id });
            router.push("/");
          }}
        />
      ) : (
        <ActionModal
          isOpen={removing !== null}
          onClose={() => setRemoving(null)}
          title="Remove this link?"
          paragraph={
            removing
              ? `${storeLabel(removing.store, removing.url)}${removing.region ? ` · ${removing.region}` : ""} and its price history will be deleted.`
              : ""
          }
          size="small"
          primaryButton={{
            label: "Remove",
            onClick: () => {
              if (!removing) return;
              void removeLinkAction({ linkId: removing.id }).then(
                (result) => {
                  if (!result.ok) toast.error("Couldn't remove that link.");
                  setRemoving(null);
                  router.refresh();
                },
                () => toast.error("Something went wrong. Try again.")
              );
            },
          }}
          secondaryButton={{ label: "Cancel", onClick: () => setRemoving(null) }}
        />
      )}
    </main>
  );
}

function LinkCard({
  link,
  summary,
  lowest,
  rates,
  homeCurrency,
  onRemove,
}: {
  link: DetailLink;
  summary: LinkSummary;
  /** This link is the item's current lowest price. */
  lowest: boolean;
  rates: Record<string, number>;
  homeCurrency: string;
  onRemove: () => void;
}) {
  const check = link.latest;
  const current = summary.current;
  const muted = summary.stale || check?.inStock === false;
  const status = summary.stale
    ? "Check failed"
    : check?.inStock === false
      ? "Out of stock"
      : check
        ? null
        : "No price yet";
  const seenConverted =
    link.lowestSeen &&
    convert(link.lowestSeen.price, link.lowestSeen.currency, homeCurrency, rates);

  return (
    <div
      className={cn(
        "card-raised flex flex-col gap-3 rounded-2xl bg-(--surface-100) p-4 surface-blur",
        lowest && "ring-2 ring-(--primary)"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-(--text)">
            {storeLabel(link.store, link.url)}
            {link.region ? ` · ${link.region}` : ""}
            {lowest && <span className="ml-2 text-xs font-semibold text-(--primary)">Lowest</span>}
          </p>
          {link.editionName && (
            <p className="truncate text-xs text-(--text-muted)">{link.editionName}</p>
          )}
        </div>
        {current && (
          <div className={cn("shrink-0 text-right", muted && "opacity-50")}>
            <p className="text-lg font-semibold text-(--text)">
              {formatPrice(current.price, current.currency)}
              {check?.salePrice !== null && check && (
                <span className="ml-2 text-xs font-normal text-(--text-muted) line-through">
                  {formatPrice(check.normalPrice, check.currency)}
                </span>
              )}
            </p>
            {current.currency !== homeCurrency && current.converted !== null && (
              <p className="text-xs text-(--text-muted)">
                ≈ {formatPrice(current.converted, homeCurrency, { round: true })}
              </p>
            )}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-(--text-secondary)">
        {check?.discountPercent ? (
          <>
            <dt className="text-(--text-muted)">Sale</dt>
            <dd>
              −{check.discountPercent}%
              {check.saleEndsAt && `, ends ${formatShortDate(check.saleEndsAt)}`}
            </dd>
          </>
        ) : null}
        {link.lowestSeen && (
          <>
            <dt className="text-(--text-muted)">Lowest seen</dt>
            <dd>
              {formatPrice(link.lowestSeen.price, link.lowestSeen.currency)}
              {link.lowestSeen.currency !== homeCurrency && seenConverted !== null && (
                <span className="text-(--text-muted)">
                  {" "}
                  (≈ {formatPrice(seenConverted, homeCurrency, { round: true })})
                </span>
              )}{" "}
              <span className="text-(--text-muted)">since {formatShortDate(link.createdAt)}</span>
            </dd>
          </>
        )}
        <dt className="text-(--text-muted)">Checked</dt>
        <dd>
          {formatAgo(link.lastCheckedAt)}
          {summary.stale && `, last worked ${formatAgo(link.lastSuccessAt)}`}
        </dd>
        {status && (
          <>
            <dt className="text-(--text-muted)">Status</dt>
            <dd className={cn(summary.stale && "text-(--red-500)")}>{status}</dd>
          </>
        )}
      </dl>

      <div className="flex items-center justify-between">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-(--text) hover:underline"
        >
          Open in store <ArrowSquareOutIcon size={14} />
        </a>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-(--text-muted) transition-colors hover:text-(--red-500)"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-(--text-subtle) transition-[color,background-color] hover:bg-(--surface-150) hover:text-(--text)"
    >
      {children}
    </button>
  );
}

function RenameModal({
  isOpen,
  onClose,
  name,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (isOpen) setValue(name);
  }, [isOpen, name]);

  async function save() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(value.trim());
      onClose();
    } catch {
      toast.error("Couldn't rename it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename"
      size="small"
      content={<TextInput value={value} onChange={setValue} placeholder="Name" autoFocus />}
      primaryButton={{
        label: "Save",
        onClick: () => void save(),
        loading: saving,
        disabled: !value.trim(),
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}

function DeleteItemModal({
  isOpen,
  onClose,
  name,
  reason,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  /** "last-link": reached by removing the item's only link. */
  reason: "all" | "last-link";
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${name}?`}
      paragraph={
        reason === "last-link"
          ? "This is the item's only link, so removing it deletes the item and its price history."
          : "Its links and their price history will be deleted too."
      }
      size="small"
      primaryButton={{
        label: "Delete",
        loading: busy,
        onClick: () => {
          setBusy(true);
          void onConfirm().catch(() => {
            setBusy(false);
            toast.error("Couldn't delete it. Try again.");
          });
        },
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}

/** Replaces the item's image with an uploaded one, or removes it. */
function ImageModal({
  isOpen,
  onClose,
  currentUrl,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string | null;
  /** A file to upload, or null to remove the image. */
  onSave: (file: File | null) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setFile(null);
  }, [isOpen]);
  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(next: File | null) {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(next);
      onClose();
    } catch {
      toast.error("Couldn't save the image. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Image"
      size="small"
      content={
        <div className="flex items-center gap-4">
          <ItemImage url={fileUrl ?? currentUrl} size="lg" />
          <div className="flex flex-col items-start gap-2 text-sm">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="font-medium text-(--text) hover:underline"
            >
              {file ? "Pick another…" : "Upload an image…"}
            </button>
            {currentUrl && !file && (
              <button
                type="button"
                onClick={() => void save(null)}
                className="text-(--text-muted) hover:text-(--red-500)"
              >
                Remove image
              </button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      }
      primaryButton={{
        label: "Save",
        onClick: () => void save(file),
        loading: saving,
        disabled: !file,
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}

/**
 * Records a purchase: what was paid (pre-filled with the current lowest price, in that
 * store's currency), where, and when (today by default).
 */
function MarkBoughtModal({
  isOpen,
  onClose,
  name,
  lowest,
  currencies,
  shops,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  lowest: ItemSummary["lowest"];
  currencies: string[];
  shops: string[];
  onSave: (input: {
    price: number;
    currency: string;
    store: string;
    date: string;
  }) => Promise<void>;
}) {
  const today = () => new Date().toLocaleDateString("sv-SE");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState(currencies[0] ?? "SEK");
  const [store, setStore] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from the cheapest link each time the dialog opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on open.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDate(today());
    if (lowest) {
      const digits = minorDigits(lowest.current.currency);
      setPrice((lowest.current.price / 10 ** digits).toFixed(digits));
      setCurrency(lowest.current.currency);
      setStore(
        `${storeLabel(lowest.store, lowest.url)}${lowest.region ? ` · ${lowest.region}` : ""}`
      );
    } else {
      setPrice("");
      setStore(shops[0] ?? "");
    }
  }, [isOpen]);

  async function save() {
    const minor = toMinorUnits(price, currency);
    if (minor === null) {
      setError("Enter the price you paid.");
      return;
    }
    if (!store.trim()) {
      setError("Say where you bought it.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ price: minor, currency, store, date });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const field = "rounded-[10px] bg-(--surface-sunken) px-2 py-2 text-sm text-(--text) outline-none";

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bought ${name}?`}
      paragraph="It moves to your Bought page and stops being checked."
      size="small"
      content={
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput value={price} onChange={setPrice} placeholder="Price paid" />
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Currency"
              className={field}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <TextInput value={store} onChange={setStore} placeholder="Where" />
          {shops.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {shops.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStore(s)}
                  className="rounded-full bg-(--surface-sunken) px-2.5 py-1 text-xs text-(--text-secondary) hover:text-(--text)"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <label className="flex items-center justify-between gap-3 text-sm text-(--text-secondary)">
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-(--red-500)">
              {error}
            </p>
          )}
        </div>
      }
      primaryButton={{ label: "Mark as bought", onClick: () => void save(), loading: saving }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}

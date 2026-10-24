"use client";

import { AddItemModal } from "@/components/add-item-modal";
import { ItemImage } from "@/components/item-image";
import {
  deleteItemAction,
  presignImageUploadAction,
  removeLinkAction,
  renameItemAction,
  setItemImageAction,
} from "@/lib/actions";
import { formatAgo, formatPrice, formatShortDate, storeLabel } from "@/lib/format";
import { uploadItemImage } from "@/lib/item-image";
import type { ItemDetail } from "@/lib/queries";
import { type LinkSummary, convert, summarizeItem } from "@/lib/summary";
import { ActionModal, FloatingCTA, TextInput, cn } from "@jf/ui";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = { item: ItemDetail; rates: Record<string, number>; homeCurrency: string };

type DetailLink = ItemDetail["links"][number];

export function ItemDetailClient({ item, rates, homeCurrency }: Props) {
  const router = useRouter();
  const summary = summarizeItem(item, rates, homeCurrency);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<DetailLink | null>(null);
  const [changingImage, setChangingImage] = useState(false);

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

      <FloatingCTA
        label="Add link"
        icon={<PlusIcon size={20} weight="bold" />}
        onClick={() => setAdding(true)}
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

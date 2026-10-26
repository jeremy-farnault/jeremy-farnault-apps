"use client";

import {
  type ImageChoice,
  type LinkPreview,
  type Rejection,
  addItemAction,
  addLinkToItemAction,
  presignImageUploadAction,
  previewLinkAction,
} from "@/lib/actions";
import { formatPrice, storeLabel } from "@/lib/format";
import { uploadItemImage } from "@/lib/item-image";
import { STEAM_REGIONS } from "@/lib/price-reader/steam";
import { ActionModal, TextInput } from "@jf/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePicker } from "./image-picker";
import { NativeSelect } from "./native-select";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** `newItem` is false when the link joined an item that already existed. */
  onAdded: (added: { itemId: string; newItem: boolean; store: string }) => void;
  /** Adds the link to this item instead of creating a new one. */
  item?: { id: string; name: string };
};

type Step = { kind: "paste" } | { kind: "preview"; preview: LinkPreview };

/**
 * Paste a link, see what Scanner read from it, confirm. Nothing is saved until the user
 * confirms: the preview is their check that the right product and price were found. With
 * `item`, the link joins that item (from its page) and the name field is left out.
 *
 * Enter is handled by ActionModal alone, which runs the primary button of the current step.
 */
export function AddItemModal({ isOpen, onClose, onAdded, item }: Props) {
  const title = item ? "Add a link" : "Add to wishlist";
  const [step, setStep] = useState<Step>({ kind: "paste" });
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [editionId, setEditionId] = useState<string | null>(null);
  const [error, setError] = useState<Rejection | null>(null);
  const [busy, setBusy] = useState(false);
  // New items only: keep the shop's image, upload one, or go without.
  const [imageChoice, setImageChoice] = useState<"found" | "upload" | "none">("none");
  const [file, setFile] = useState<File | null>(null);
  // With a suggestion: "existing" adds the link to the suggested item, "new" makes one.
  // Neither is preselected, so nothing is merged unless the user picks it.
  const [target, setTarget] = useState<"new" | "existing" | null>(null);

  // Reset between openings so an abandoned link doesn't linger.
  useEffect(() => {
    if (isOpen) {
      setStep({ kind: "paste" });
      setUrl("");
      setName("");
      setEditionId(null);
      setError(null);
      setImageChoice("none");
      setFile(null);
      setTarget(null);
    }
  }, [isOpen]);

  /**
   * Reads the link for the preview. `region` re-reads a Steam link for another storefront,
   * keeping the name the user may have edited; a failure there leaves the last good preview.
   */
  async function read(region?: string) {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await previewLinkAction({ url, region: region ?? null, suggest: !item });
      if (!result.ok) {
        setError(result);
        return;
      }
      const { preview } = result;
      if (region === undefined) {
        setTarget(preview.suggestion ? null : "new");
        setName(preview.name);
        setImageChoice(preview.imageUrl ? "found" : "none");
      }
      const untracked = preview.editions.filter((e) => !preview.trackedEditionIds.includes(e.id));
      setEditionId(preview.editions.length > 1 ? null : (untracked[0]?.id ?? null));
      setStep({ kind: "preview", preview });
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function add(preview: LinkPreview) {
    const into = joinedItem(preview);
    if (busy || target === null || (!into && !name.trim())) return;
    const several = preview.editions.length > 1;
    if (several && !editionId) return;
    setBusy(true);
    try {
      const link = {
        url: preview.url,
        editionId: several ? editionId : null,
        region: preview.store === "steam" ? preview.region : null,
      };
      const result = into
        ? await addLinkToItemAction({ ...link, itemId: into.id })
        : await addItemAction({ ...link, name, image: await imageForAdd() });
      if (!result.ok) {
        setError(result);
        return;
      }
      toast.success(into ? `Link added to ${into.name}` : `${name.trim()} added`);
      onAdded({ itemId: result.itemId, newItem: !into, store: preview.store });
      onClose();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** The item the link joins: the page's own item, or the suggested one if picked. */
  function joinedItem(preview: LinkPreview): { id: string; name: string } | null {
    if (item) return item;
    if (target === "existing" && preview.suggestion) {
      return { id: preview.suggestion.itemId, name: preview.suggestion.itemName };
    }
    return null;
  }

  async function imageForAdd(): Promise<ImageChoice> {
    if (imageChoice === "upload" && file) {
      return { key: await uploadItemImage(file, presignImageUploadAction) };
    }
    return imageChoice === "found" ? "found" : "none";
  }

  const errorLine = error && (
    <p role="alert" className="text-sm text-(--red-500)">
      {error.message}
      {error.item && error.item.id !== item?.id && (
        <>
          {" "}
          <Link href={`/items/${error.item.id}`} onClick={onClose} className="underline">
            Open it
          </Link>
        </>
      )}
    </p>
  );

  if (step.kind === "paste") {
    return (
      <ActionModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        paragraph={
          item ? `Another shop or region for ${item.name}.` : "Paste the link to a product page."
        }
        size="small"
        content={
          <div className="flex flex-col gap-3">
            <TextInput
              value={url}
              onChange={(v) => {
                setUrl(v);
                setError(null);
              }}
              placeholder="https://"
              autoFocus
            />
            {errorLine}
          </div>
        }
        primaryButton={{
          label: "Read price",
          onClick: () => void read(),
          loading: busy,
          disabled: !url.trim(),
        }}
        secondaryButton={{ label: "Cancel", onClick: onClose }}
      />
    );
  }

  const { preview } = step;
  const several = preview.editions.length > 1;
  const into = joinedItem(preview);
  const shown =
    preview.editions.find((e) => e.id === editionId) ?? (several ? null : preview.editions[0]);

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      paragraph={`Found on ${storeLabel(preview.store, preview.url)}${preview.region ? ` · ${preview.region}` : ""}`}
      size="small"
      content={
        <div className="flex flex-col gap-4">
          {preview.suggestion && (
            <fieldset className="flex flex-col gap-1.5 rounded-xl bg-(--surface-sunken) px-3 py-2">
              <legend className="sr-only">Add to an item you already track?</legend>
              <p className="text-xs text-(--text-muted)">This looks like something you track.</p>
              {(["existing", "new"] as const).map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-(--text)"
                >
                  <input
                    type="radio"
                    name="target"
                    checked={target === value}
                    onChange={() => setTarget(value)}
                  />
                  {value === "existing" ? `Add to ${preview.suggestion?.itemName}` : "New item"}
                </label>
              ))}
            </fieldset>
          )}

          {!into && <TextInput value={name} onChange={setName} placeholder="Name" />}

          {!into && (
            <ImagePicker
              foundUrl={preview.imageUrl}
              choice={imageChoice}
              file={file}
              onChoice={setImageChoice}
              onFile={(f) => {
                setFile(f);
                setImageChoice(f ? "upload" : preview.imageUrl ? "found" : "none");
              }}
            />
          )}

          {preview.store === "steam" && (
            <div className="flex items-center justify-between gap-3 text-sm text-(--text-secondary)">
              <span aria-hidden>Steam store</span>
              <NativeSelect
                aria-label="Steam store"
                value={preview.region ?? ""}
                disabled={busy}
                onChange={(region) => void read(region)}
                className="text-(--text)"
              >
                {STEAM_REGIONS.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          {several ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs text-(--text-muted)">Which one?</legend>
              {preview.editions.map((e) => {
                const taken = preview.trackedEditionIds.includes(e.id);
                const checked = e.id === editionId;
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      checked ? "bg-(--surface-sunken) text-(--text)" : "text-(--text-secondary)"
                    } ${taken ? "opacity-50" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      name="edition"
                      value={e.id}
                      checked={checked}
                      disabled={taken}
                      onChange={() => setEditionId(e.id)}
                    />
                    <span className="flex-1">
                      {e.name}
                      {taken && " (already tracked)"}
                      {!e.inStock && " (out of stock)"}
                    </span>
                    <span className="font-medium">
                      {formatPrice(e.salePrice ?? e.normalPrice, e.currency)}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : (
            shown && (
              <div className="flex items-baseline justify-between rounded-xl bg-(--surface-sunken) px-3 py-2">
                <span className="text-sm text-(--text-muted)">
                  {shown.inStock ? "Price now" : "Out of stock"}
                </span>
                <span className="text-lg font-semibold text-(--text)">
                  {formatPrice(shown.salePrice ?? shown.normalPrice, shown.currency)}
                  {shown.salePrice !== null && (
                    <span className="ml-2 text-xs font-normal text-(--text-muted) line-through">
                      {formatPrice(shown.normalPrice, shown.currency)}
                    </span>
                  )}
                </span>
              </div>
            )
          )}
          {errorLine}
        </div>
      }
      primaryButton={{
        label: into ? "Add link" : "Add to wishlist",
        onClick: () => void add(preview),
        loading: busy,
        disabled:
          target === null ||
          (!into && !name.trim()) ||
          (several && !editionId) ||
          (!into && imageChoice === "upload" && !file),
      }}
      secondaryButton={{ label: "Back", onClick: () => setStep({ kind: "paste" }) }}
    />
  );
}

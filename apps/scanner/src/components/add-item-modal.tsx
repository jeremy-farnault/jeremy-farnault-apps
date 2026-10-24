"use client";

import { type LinkPreview, type Rejection, addItemAction, previewLinkAction } from "@/lib/actions";
import { formatPrice, storeLabel } from "@/lib/format";
import { STEAM_REGIONS } from "@/lib/price-reader/steam";
import { ActionModal, TextInput } from "@jf/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
};

type Step = { kind: "paste" } | { kind: "preview"; preview: LinkPreview };

/**
 * Paste a link, see what Scanner read from it, confirm. Nothing is saved until "Add to
 * wishlist": the preview is the user's check that the right product and price were found.
 *
 * Enter is handled by ActionModal alone, which runs the primary button of the current step.
 */
export function AddItemModal({ isOpen, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>({ kind: "paste" });
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [editionId, setEditionId] = useState<string | null>(null);
  const [error, setError] = useState<Rejection | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset between openings so an abandoned link doesn't linger.
  useEffect(() => {
    if (isOpen) {
      setStep({ kind: "paste" });
      setUrl("");
      setName("");
      setEditionId(null);
      setError(null);
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
      const result = await previewLinkAction({ url, region: region ?? null });
      if (!result.ok) {
        setError(result);
        return;
      }
      const { preview } = result;
      if (region === undefined) setName(preview.name);
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
    if (busy || !name.trim()) return;
    const several = preview.editions.length > 1;
    if (several && !editionId) return;
    setBusy(true);
    try {
      const result = await addItemAction({
        url: preview.url,
        name,
        editionId: several ? editionId : null,
        region: preview.store === "steam" ? preview.region : null,
      });
      if (!result.ok) {
        setError(result);
        return;
      }
      toast.success(`${name.trim()} added`);
      onAdded();
      onClose();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const errorLine = error && (
    <p role="alert" className="text-sm text-(--red-500)">
      {error.message}
    </p>
  );

  if (step.kind === "paste") {
    return (
      <ActionModal
        isOpen={isOpen}
        onClose={onClose}
        title="Add to wishlist"
        paragraph="Paste the link to a product page."
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
  const shown =
    preview.editions.find((e) => e.id === editionId) ?? (several ? null : preview.editions[0]);

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add to wishlist"
      paragraph={`Found on ${storeLabel(preview.store, preview.url)}${preview.region ? ` · ${preview.region}` : ""}`}
      size="small"
      content={
        <div className="flex flex-col gap-4">
          <TextInput value={name} onChange={setName} placeholder="Name" />

          {preview.store === "steam" && (
            <label className="flex items-center justify-between gap-3 text-sm text-(--text-secondary)">
              <span>Steam store</span>
              <select
                value={preview.region ?? ""}
                disabled={busy}
                onChange={(e) => void read(e.target.value)}
                className="cursor-pointer rounded-[10px] bg-(--surface-sunken) px-2 py-1 text-sm text-(--text) outline-none"
              >
                {STEAM_REGIONS.map((r) => (
                  <option key={r.region} value={r.region}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
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
        label: "Add to wishlist",
        onClick: () => void add(preview),
        loading: busy,
        disabled: !name.trim() || (several && !editionId),
      }}
      secondaryButton={{ label: "Back", onClick: () => setStep({ kind: "paste" }) }}
    />
  );
}

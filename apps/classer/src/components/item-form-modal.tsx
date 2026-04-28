"use client";

import {
  createItemAction,
  generatePresignedUploadUrlAction,
  updateItemAction,
} from "@/lib/actions";
import type { ItemResult } from "@/lib/actions";
import { Button, TextInput, Textarea } from "@jf/ui";
import { RankingIcon, XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";

type ImageState =
  | { status: "none" }
  | { status: "existing"; key: string; url: string }
  | { status: "pending"; file: File; previewUrl: string }
  | { status: "removed" };

type FormState = {
  name: string;
  description: string;
  rank: number;
};

export type ItemForEdit = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  rank: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ItemResult) => void;
  classerId: string;
  itemCount: number;
  item?: ItemForEdit;
};

export function ItemFormModal({ isOpen, onClose, onSuccess, classerId, itemCount, item }: Props) {
  const isEdit = item !== undefined;
  const maxRank = isEdit ? itemCount : itemCount + 1;
  const defaultRank = isEdit ? item.rank : itemCount + 1;

  const [form, setForm] = useState<FormState>({ name: "", description: "", rank: defaultRank });
  const [nameError, setNameError] = useState<string | undefined>();
  const [imageState, setImageState] = useState<ImageState>({ status: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const prevImageState = useRef<ImageState>(imageState);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setForm({ name: item.name, description: item.description ?? "", rank: item.rank });
        setImageState(
          item.imageKey && item.imageUrl
            ? { status: "existing", key: item.imageKey, url: item.imageUrl }
            : { status: "none" }
        );
      } else {
        setForm({ name: "", description: "", rank: itemCount + 1 });
        setImageState({ status: "none" });
      }
      setNameError(undefined);
      setFileInputKey((k) => k + 1);
    }
  }, [isOpen, item, itemCount]);

  useEffect(() => {
    const prev = prevImageState.current;
    if (prev.status === "pending" && imageState.status !== "pending") {
      URL.revokeObjectURL(prev.previewUrl);
    }
    prevImageState.current = imageState;
  }, [imageState]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name") setNameError(undefined);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageState({ status: "pending", file, previewUrl: URL.createObjectURL(file) });
  }

  function handleRemoveImage() {
    if (imageState.status === "existing") {
      setImageState({ status: "removed" });
    } else if (imageState.status === "pending") {
      setImageState({ status: "none" });
      setFileInputKey((k) => k + 1);
    }
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      let imageKey: string | null = null;

      if (imageState.status === "existing") {
        imageKey = imageState.key;
      } else if (imageState.status === "pending") {
        const { key, url } = await generatePresignedUploadUrlAction(imageState.file.name);
        await fetch(url, {
          method: "PUT",
          body: imageState.file,
          headers: { "Content-Type": imageState.file.type },
        });
        imageKey = key;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        imageKey,
        rank: form.rank,
      };

      let result: ItemResult;
      if (isEdit) {
        result = await updateItemAction({
          id: item.id,
          ...payload,
          removeImage: imageState.status === "removed",
          itemCount,
        });
      } else {
        result = await createItemAction({ classerId, ...payload, itemCount });
      }

      onSuccess(result);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const previewUrl =
    imageState.status === "existing"
      ? imageState.url
      : imageState.status === "pending"
        ? imageState.previewUrl
        : null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,34,38,0.30)] backdrop-blur-[13px] animate-[overlay-in_0.3s_ease-in-out] p-4">
          <Dialog.Content className="relative flex w-full max-w-[600px] flex-col rounded-[22px] bg-(--card) p-8 shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none animate-[modal-in_0.3s_ease-in-out] max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-(--grey-500) hover:text-(--grey-900) disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XIcon size={16} weight="bold" />
            </button>

            <Dialog.Title className="mb-6 flex items-center gap-2 text-base font-semibold text-(--grey-900)">
              <RankingIcon size={18} weight="bold" className="text-(--green-500)" />
              {isEdit ? "Edit Item" : "New Item"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="item-name" className="text-sm font-medium text-(--grey-700)">
                  Name
                </label>
                <TextInput
                  id="item-name"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  placeholder="e.g. Inception, Chez Panisse…"
                  disabled={submitting}
                />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="item-description" className="text-sm font-medium text-(--grey-700)">
                  Description
                </label>
                <Textarea
                  id="item-description"
                  value={form.description}
                  onChange={(v) => setField("description", v)}
                  placeholder="A note about this item (optional)"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="item-rank" className="text-sm font-medium text-(--grey-700)">
                  Rank
                </label>
                <input
                  id="item-rank"
                  type="number"
                  min={1}
                  max={maxRank}
                  value={form.rank}
                  onChange={(e) =>
                    setField("rank", Math.max(1, Math.min(maxRank, Number(e.target.value))))
                  }
                  disabled={submitting}
                  className="w-full rounded-[10px] border border-(--surface-300) bg-(--surface-100) px-3 py-2 text-sm text-(--grey-900) outline-none focus:border-(--green-500) focus:ring-1 focus:ring-(--green-500) disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-(--grey-500)">Valid range: 1 – {maxRank}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="item-image" className="text-sm font-medium text-(--grey-700)">
                  Image
                </label>
                {previewUrl ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-40 w-full rounded-[12px] object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={submitting}
                      aria-label="Remove image"
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:cursor-not-allowed"
                    >
                      <XIcon size={14} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <input
                    key={fileInputKey}
                    id="item-image"
                    type="file"
                    accept="image/*"
                    disabled={submitting}
                    onChange={handleFileChange}
                    className="text-sm text-(--grey-700) file:mr-3 file:rounded-[8px] file:border-0 file:bg-(--surface-150) file:px-3 file:py-1.5 file:text-sm file:text-(--grey-900) file:cursor-pointer hover:file:bg-(--surface-200)"
                  />
                )}
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Saving…" : isEdit ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

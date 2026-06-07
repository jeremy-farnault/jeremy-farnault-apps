"use client";

import { createSpot, generatePresignedUploadUrlAction } from "@/lib/actions";
import type { CategoryRow } from "@/lib/queries";
import { Select, SelectItem, TextInput, Textarea } from "@jf/ui";
import { MapPinIcon, XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ImageState = { status: "none" } | { status: "pending"; file: File; previewUrl: string };

type FormState = {
  name: string;
  categoryId: string;
  description: string;
};

interface SpotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  categories: CategoryRow[];
}

export function SpotFormModal({ isOpen, onClose, location, categories }: SpotFormModalProps) {
  const [form, setForm] = useState<FormState>({ name: "", categoryId: "", description: "" });
  const [nameError, setNameError] = useState<string | undefined>();
  const [imageState, setImageState] = useState<ImageState>({ status: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const prevImageState = useRef<ImageState>(imageState);

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", categoryId: "", description: "" });
      setNameError(undefined);
      setImageState({ status: "none" });
      setFileInputKey((k) => k + 1);
    }
  }, [isOpen]);

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
    setImageState({ status: "none" });
    setFileInputKey((k) => k + 1);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!location) return;

    setSubmitting(true);
    try {
      let photoKey: string | null = null;
      if (imageState.status === "pending") {
        const { key, url } = await generatePresignedUploadUrlAction(imageState.file.name);
        await fetch(url, {
          method: "PUT",
          body: imageState.file,
          headers: { "Content-Type": imageState.file.type },
        });
        photoKey = key;
      }

      await createSpot({
        name: form.name.trim(),
        lat: location.lat,
        lng: location.lng,
        categoryId: form.categoryId || null,
        description: form.description.trim() || null,
        photoKey,
      });

      toast.success("Spot added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const previewUrl = imageState.status === "pending" ? imageState.previewUrl : null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,34,38,0.30)] backdrop-blur-[13px] animate-[overlay-in_0.3s_ease-in-out] p-4">
          <Dialog.Content className="relative flex w-full max-w-[400px] flex-col rounded-[22px] bg-(--card) p-8 shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none animate-[modal-in_0.3s_ease-in-out] max-h-[90vh] overflow-y-auto">
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
              <MapPinIcon size={18} weight="bold" className="text-(--primary)" />
              New Spot
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="spot-name" className="text-sm font-medium text-(--grey-700)">
                  Name
                </label>
                <TextInput
                  id="spot-name"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  placeholder="e.g. Favourite café…"
                  disabled={submitting}
                  autoFocus
                />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="spot-category" className="text-sm font-medium text-(--grey-700)">
                  Category
                </label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setField("categoryId", v)}
                  disabled={submitting}
                  placeholder="No category"
                >
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="spot-description" className="text-sm font-medium text-(--grey-700)">
                  Description
                </label>
                <Textarea
                  id="spot-description"
                  value={form.description}
                  onChange={(v) => setField("description", v)}
                  placeholder="A note about this spot (optional)"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="spot-photo" className="text-sm font-medium text-(--grey-700)">
                  Photo
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
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:cursor-not-allowed"
                    >
                      <XIcon size={14} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <input
                    key={fileInputKey}
                    id="spot-photo"
                    type="file"
                    accept="image/*"
                    disabled={submitting}
                    onChange={handleFileChange}
                    className="text-sm text-(--grey-700) file:mr-3 file:cursor-pointer file:rounded-[8px] file:border-0 file:bg-(--surface-150) file:px-3 file:py-1.5 file:text-sm file:text-(--grey-900) hover:file:bg-(--surface-200)"
                  />
                )}
              </div>

              {location && (
                <p className="font-mono text-xs text-(--grey-400)">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-(--border) text-sm font-medium text-(--grey-700) hover:bg-(--surface-150) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-(--primary) text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving…" : "Add spot"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

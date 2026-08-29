"use client";

import { ACCEPT_ATTR, MAX_PHOTOS, getImageDimensions, validatePhotoFile } from "@/lib/image";
import {
  type PhotoInput,
  createItemAction,
  deleteItemAction,
  generatePresignedUploadUrlAction,
  getItemForEdit,
  updateItemAction,
} from "@/lib/item-actions";
import { ActionModal, DatePicker, Switch, TextInput } from "@jf/ui";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type PhotoDraft =
  | { kind: "existing"; storageKey: string; url: string; width: number; height: number }
  | { kind: "pending"; file: File; previewUrl: string; width: number; height: number };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function previewUrlOf(photo: PhotoDraft): string {
  return photo.kind === "existing" ? photo.url : photo.previewUrl;
}

function revokePending(photos: PhotoDraft[]) {
  for (const p of photos) {
    if (p.kind === "pending") URL.revokeObjectURL(p.previewUrl);
  }
}

type Props = {
  isOpen: boolean;
  /** null = create, otherwise edit that item. */
  itemId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ItemFormModal({ isOpen, itemId, onClose, onSaved }: Props) {
  const isEdit = itemId !== null;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [isPublic, setIsPublic] = useState(false); // new posts default to Draft
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset / populate whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmingDelete(false);

    if (itemId === null) {
      setTitle("");
      setDate(today());
      setIsPublic(false);
      setPhotos([]);
      return;
    }

    setLoadingEdit(true);
    getItemForEdit(itemId)
      .then((item) => {
        if (!item) {
          setError("This item could not be loaded.");
          return;
        }
        setTitle(item.title ?? "");
        setDate(item.date);
        setIsPublic(item.visibility === "public");
        setPhotos(
          item.photos.map((p) => ({
            kind: "existing" as const,
            storageKey: p.storageKey,
            url: p.url,
            width: p.width,
            height: p.height,
          }))
        );
      })
      .finally(() => setLoadingEdit(false));
  }, [isOpen, itemId]);

  // Revoke object URLs for pending previews when the modal closes.
  useEffect(() => {
    if (isOpen) return;
    setPhotos((prev) => {
      revokePending(prev);
      return prev;
    });
  }, [isOpen]);

  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const selected = Array.from(files);
    if (selected.length > remaining) {
      setError(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added.`);
    }

    const additions: PhotoDraft[] = [];
    for (const file of selected.slice(0, remaining)) {
      const validationError = validatePhotoFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      try {
        const { width, height } = await getImageDimensions(file);
        additions.push({
          kind: "pending",
          file,
          previewUrl: URL.createObjectURL(file),
          width,
          height,
        });
      } catch {
        setError(`Could not read "${file.name}".`);
      }
    }

    if (additions.length > 0) setPhotos((prev) => [...prev, ...additions]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setPhotos((prev) => {
      const target = index + dir;
      const a = prev[index];
      const b = prev[target];
      if (!a || !b) return prev;
      const next = [...prev];
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const photo = prev[index];
      if (photo?.kind === "pending") URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    if (submitting || loadingEdit) return;
    if (photos.length === 0) {
      setError("Add at least one photo.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const uploaded: PhotoInput[] = [];
      for (const photo of photos) {
        if (photo.kind === "existing") {
          uploaded.push({ storageKey: photo.storageKey, width: photo.width, height: photo.height });
          continue;
        }
        const { key, url } = await generatePresignedUploadUrlAction(photo.file.name);
        const res = await fetch(url, {
          method: "PUT",
          body: photo.file,
          headers: { "Content-Type": photo.file.type },
        });
        if (!res.ok) throw new Error("Photo upload failed. Please try again.");
        uploaded.push({ storageKey: key, width: photo.width, height: photo.height });
      }

      const payload = {
        title: title.trim() ? title.trim() : null,
        date,
        visibility: isPublic ? ("public" as const) : ("draft" as const),
        photos: uploaded,
      };

      if (isEdit && itemId) {
        await updateItemAction({ id: itemId, ...payload });
      } else {
        await createItemAction(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!itemId) return;
    setSubmitting(true);
    try {
      await deleteItemAction(itemId);
      setConfirmingDelete(false);
      onSaved();
    } catch (err) {
      setConfirmingDelete(false);
      setError(err instanceof Error ? err.message : "Could not delete this item.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || loadingEdit;

  return (
    <>
      <ActionModal
        isOpen={isOpen}
        onClose={onClose}
        size="large"
        title={isEdit ? "Edit post" : "New post"}
        closeOnBackdropClick={!busy}
        closeOnEscapeKeyDown={!busy}
        content={
          <div className="flex flex-col gap-4">
            {/* Photos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-(--grey-500)">
                  Photos ({photos.length}/{MAX_PHOTOS})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={previewUrlOf(photo)}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-(--surface-200)"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrlOf(photo)} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[rgba(0,0,0,0.45)] px-1 py-0.5">
                      <button
                        type="button"
                        aria-label="Move left"
                        disabled={index === 0 || busy}
                        onClick={() => movePhoto(index, -1)}
                        className="text-white disabled:opacity-30"
                      >
                        <ArrowLeftIcon size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove photo"
                        disabled={busy}
                        onClick={() => removePhoto(index)}
                        className="text-white disabled:opacity-30"
                      >
                        <TrashIcon size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move right"
                        disabled={index === photos.length - 1 || busy}
                        onClick={() => movePhoto(index, 1)}
                        className="text-white disabled:opacity-30"
                      >
                        <ArrowRightIcon size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-(--grey-300) text-(--grey-500) hover:text-(--grey-900) disabled:opacity-50"
                  >
                    <PlusIcon size={18} />
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                hidden
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </div>

            {/* Title */}
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Title (optional)"
              disabled={busy}
            />

            {/* Date + visibility */}
            <div className="flex items-center justify-between gap-4">
              <DatePicker value={date} onChange={setDate} disabled={busy} calendarAlign="start" />
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={busy}
                label={isPublic ? "Public" : "Draft"}
              />
            </div>

            {error && <p className="text-xs text-(--red-500)">{error}</p>}

            {isEdit && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 self-start text-xs font-medium text-(--red-500) hover:text-(--red-600) disabled:opacity-50"
              >
                <XIcon size={12} weight="bold" /> Delete post
              </button>
            )}
          </div>
        }
        primaryButton={{
          label: isEdit ? "Save" : "Create",
          loading: submitting,
          disabled: photos.length === 0 || loadingEdit,
          onClick: handleSubmit,
        }}
        secondaryButton={{ label: "Cancel", onClick: onClose }}
      />

      <ActionModal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        size="small"
        title="Delete post"
        paragraph="Permanently delete this post and its photos? This cannot be undone."
        primaryButton={{ label: "Delete", loading: submitting, onClick: handleDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmingDelete(false) }}
      />
    </>
  );
}

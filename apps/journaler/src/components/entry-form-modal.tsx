"use client";

import {
  createEntryAction,
  generatePresignedUploadUrlAction,
  updateEntryAction,
} from "@/lib/actions";
import type { EntryCategory } from "@/lib/queries";
import { Button, DatePicker, Select, SelectItem, TextInput, Textarea } from "@jf/ui";
import { XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import type { CardEntry } from "./entry-card";

type ImageState =
  | { status: "none" }
  | { status: "existing"; key: string; url: string }
  | { status: "pending"; file: File; previewUrl: string }
  | { status: "removed" };

type FormState = {
  title: string;
  category: EntryCategory | "";
  date: string;
  rating: string;
  comment: string;
};

type FormErrors = {
  title?: string;
  category?: string;
  date?: string;
};

const CATEGORIES: EntryCategory[] = ["Book", "Game", "Manga", "Movie", "TV Show"];
const RATINGS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: CardEntry, isEdit: boolean) => void;
  entry?: CardEntry;
};

export function EntryFormModal({ isOpen, onClose, onSuccess, entry }: Props) {
  const isEdit = entry !== undefined;

  const [form, setForm] = useState<FormState>({
    title: "",
    category: "",
    date: today(),
    rating: "none",
    comment: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [imageState, setImageState] = useState<ImageState>({ status: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const prevImageState = useRef<ImageState>(imageState);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (entry) {
        setForm({
          title: entry.title,
          category: entry.category,
          date: entry.date,
          rating: entry.rating !== null ? String(entry.rating) : "none",
          comment: entry.comment ?? "",
        });
        setImageState(
          entry.imageKey && entry.imageUrl
            ? { status: "existing", key: entry.imageKey, url: entry.imageUrl }
            : { status: "none" }
        );
      } else {
        setForm({ title: "", category: "", date: today(), rating: "none", comment: "" });
        setImageState({ status: "none" });
      }
      setErrors({});
      setFileInputKey((k) => k + 1);
    }
  }, [isOpen, entry]);

  // Revoke object URL when a pending image is replaced or removed
  useEffect(() => {
    const prev = prevImageState.current;
    if (prev.status === "pending" && imageState.status !== "pending") {
      URL.revokeObjectURL(prev.previewUrl);
    }
    prevImageState.current = imageState;
  }, [imageState]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
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

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.category) next.category = "Category is required";
    if (!form.date) next.date = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!validate()) return;

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
        title: form.title.trim(),
        category: form.category as EntryCategory,
        date: form.date,
        comment: form.comment.trim() || null,
        rating: form.rating && form.rating !== "none" ? Number(form.rating) : null,
        imageKey,
      };

      let result: CardEntry;
      if (isEdit) {
        result = await updateEntryAction({
          id: entry.id,
          ...payload,
          removeImage: imageState.status === "removed",
        });
      } else {
        result = await createEntryAction(payload);
      }

      onSuccess(result, isEdit);
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
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,34,38,0.30)] backdrop-blur-[13px] animate-[overlay-in_0.3s_ease-in-out] p-4">
          <Dialog.Content className="relative flex w-full max-w-[600px] flex-col rounded-[22px] bg-(--card) p-8 shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none animate-[modal-in_0.3s_ease-in-out] max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-(--grey-500) hover:text-(--grey-900)"
            >
              <XIcon size={16} weight="bold" />
            </button>

            <Dialog.Title className="mb-6 text-base font-semibold text-(--grey-900)">
              {isEdit ? "Edit entry" : "Log entry"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label htmlFor="entry-title" className="text-sm font-medium text-(--grey-700)">
                  Title
                </label>
                <TextInput
                  id="entry-title"
                  value={form.title}
                  onChange={(v) => setField("title", v)}
                  placeholder="What did you watch, read, or play?"
                  disabled={submitting}
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              {/* Category + Date row */}
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium text-(--grey-700)">Category</p>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setField("category", v as EntryCategory)}
                    placeholder="Select category"
                    disabled={submitting}
                  >
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </Select>
                  {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="entry-date" className="text-sm font-medium text-(--grey-700)">
                    Date
                  </label>
                  <DatePicker
                    value={form.date}
                    onChange={(v) => setField("date", v)}
                    disabled={submitting}
                  />
                  {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                </div>
              </div>

              {/* Rating */}
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-(--grey-700)">Rating</p>
                <div className="flex gap-1">
                  {RATINGS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={submitting}
                      onClick={() => setField("rating", form.rating === r ? "none" : r)}
                      className={`flex flex-1 items-center justify-center rounded-[8px] py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        form.rating === r
                          ? "bg-(--grey-900) text-white"
                          : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-1">
                <label htmlFor="entry-comment" className="text-sm font-medium text-(--grey-700)">
                  Comment
                </label>
                <Textarea
                  id="entry-comment"
                  value={form.comment}
                  onChange={(v) => setField("comment", v)}
                  placeholder="Any notes or thoughts…"
                  disabled={submitting}
                />
              </div>

              {/* Image */}
              <div className="flex flex-col gap-2">
                <label htmlFor="entry-image" className="text-sm font-medium text-(--grey-700)">
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
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <XIcon size={14} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <input
                    key={fileInputKey}
                    id="entry-image"
                    type="file"
                    accept="image/*"
                    disabled={submitting}
                    onChange={handleFileChange}
                    className="text-sm text-(--grey-700) file:mr-3 file:rounded-[8px] file:border-0 file:bg-(--surface-150) file:px-3 file:py-1.5 file:text-sm file:text-(--grey-900) file:cursor-pointer hover:file:bg-(--surface-200)"
                  />
                )}
              </div>

              {/* Footer */}
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

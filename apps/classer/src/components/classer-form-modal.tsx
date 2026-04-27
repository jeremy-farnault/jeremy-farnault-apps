"use client";

import {
  createClasserAction,
  generatePresignedUploadUrlAction,
  updateClasserAction,
} from "@/lib/actions";
import type { ClasserResult } from "@/lib/actions";
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
};

export type ClasserForEdit = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ClasserResult, isEdit: boolean) => void;
  classer?: ClasserForEdit | undefined;
};

export function ClasserFormModal({ isOpen, onClose, onSuccess, classer }: Props) {
  const isEdit = classer !== undefined;

  const [form, setForm] = useState<FormState>({ name: "", description: "" });
  const [nameError, setNameError] = useState<string | undefined>();
  const [imageState, setImageState] = useState<ImageState>({ status: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const prevImageState = useRef<ImageState>(imageState);

  useEffect(() => {
    if (isOpen) {
      if (classer) {
        setForm({ name: classer.name, description: classer.description ?? "" });
        setImageState(
          classer.imageKey && classer.imageUrl
            ? { status: "existing", key: classer.imageKey, url: classer.imageUrl }
            : { status: "none" }
        );
      } else {
        setForm({ name: "", description: "" });
        setImageState({ status: "none" });
      }
      setNameError(undefined);
      setFileInputKey((k) => k + 1);
    }
  }, [isOpen, classer]);

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
      };

      let result: ClasserResult;
      if (isEdit) {
        result = await updateClasserAction({
          id: classer.id,
          ...payload,
          removeImage: imageState.status === "removed",
        });
      } else {
        result = await createClasserAction(payload);
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
              {isEdit ? "Edit Classer" : "New Classer"}
            </Dialog.Title>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="classer-name" className="text-sm font-medium text-(--grey-700)">
                  Name
                </label>
                <TextInput
                  id="classer-name"
                  value={form.name}
                  onChange={(v) => setField("name", v)}
                  placeholder="e.g. Best Coffees, Favourite Films…"
                  disabled={submitting}
                />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="classer-description"
                  className="text-sm font-medium text-(--grey-700)"
                >
                  Description
                </label>
                <Textarea
                  id="classer-description"
                  value={form.description}
                  onChange={(v) => setField("description", v)}
                  placeholder="What is this list about? (optional)"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="classer-image" className="text-sm font-medium text-(--grey-700)">
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
                    id="classer-image"
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

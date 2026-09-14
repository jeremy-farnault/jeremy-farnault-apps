"use client";

import { generatePresignedUploadUrlAction } from "@/lib/actions";
import { toAvatarBlob } from "@/lib/avatar-image";
import type { PersonRow } from "@/lib/queries";
import { ActionModal, COLOR_PALETTE, ColorPicker, Select, SelectItem, TextInput } from "@jf/ui";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PersonBubble } from "./person-bubble";

/** The avatar's lifecycle inside the form, before anything is written. */
type ImageState =
  | { status: "none" }
  | { status: "existing"; key: string; url: string }
  | { status: "pending"; file: File; previewUrl: string }
  | { status: "removed" };

export type PersonFormValues = {
  arcId: string;
  name: string;
  color: string | null;
  avatarKey: string | null;
};

type Props = {
  arcs: { id: string; name: string; color: string | null }[];
  /** Absent when adding someone; present when editing them. */
  person?: PersonRow | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: PersonFormValues) => Promise<void>;
  onDelete?: ((personId: string) => Promise<void>) | undefined;
};

/**
 * Adds or edits a person: name, arc, avatar and bubble colour in one save, since the
 * orbit shows all four as a single element.
 *
 * The avatar is uploaded straight to S3 from here, following the same presign-then-PUT
 * path the other apps use; only the resulting key reaches the server action.
 */
export function PersonFormModal({ arcs, person, isOpen, onClose, onSubmit, onDelete }: Props) {
  const isEdit = person !== undefined;

  const [name, setName] = useState("");
  const [arcId, setArcId] = useState<string>(arcs[0]?.id ?? "");
  const [color, setColor] = useState<string | null>(null);
  const [image, setImage] = useState<ImageState>({ status: "none" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const previousImage = useRef<ImageState>(image);

  // Seeded at open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!isOpen) return;
    setName(person?.name ?? "");
    setArcId(person?.arcId ?? arcs[0]?.id ?? "");
    setColor(person?.color ?? null);
    setImage(
      person?.avatarKey && person.avatarUrl
        ? { status: "existing", key: person.avatarKey, url: person.avatarUrl }
        : { status: "none" }
    );
    setConfirmingDelete(false);
    setFileInputKey((k) => k + 1);
  }, [isOpen, person, arcs]);

  // Object URLs are only alive while their state is; releasing them on transition
  // keeps a long editing session from holding every preview it ever made.
  useEffect(() => {
    const previous = previousImage.current;
    if (previous.status === "pending" && image.status !== "pending") {
      URL.revokeObjectURL(previous.previewUrl);
    }
    previousImage.current = image;
  }, [image]);

  const arc = arcs.find((a) => a.id === arcId);

  const previewUrl =
    image.status === "existing" ? image.url : image.status === "pending" ? image.previewUrl : null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage({ status: "pending", file, previewUrl: URL.createObjectURL(file) });
  }

  function removeImage() {
    setImage(image.status === "existing" ? { status: "removed" } : { status: "none" });
    setFileInputKey((k) => k + 1);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || !arcId || submitting) return;
    setSubmitting(true);
    try {
      let avatarKey: string | null = null;
      if (image.status === "existing") {
        avatarKey = image.key;
      } else if (image.status === "pending") {
        const blob = await toAvatarBlob(image.file);
        const { key, url } = await generatePresignedUploadUrlAction(`${trimmed}.jpg`);
        const res = await fetch(url, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": "image/jpeg" },
        });
        if (!res.ok) throw new Error("Photo upload failed. Please try again.");
        avatarKey = key;
      }

      await onSubmit({ arcId, name: trimmed, color, avatarKey });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    if (!person || !onDelete || submitting) return;
    setSubmitting(true);
    try {
      await onDelete(person.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit person" : "Add a person"}
      size="small"
      content={
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* The bubble previews exactly what the orbit and the lists will show. */}
            <div className="relative shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-14 w-14 rounded-full bg-(--surface-200) object-cover"
                />
              ) : (
                <PersonBubble
                  name={name || "?"}
                  avatarUrl={null}
                  color={color}
                  arcColor={arc?.color ?? null}
                  size={56}
                />
              )}
              {previewUrl && (
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={submitting}
                  aria-label="Remove photo"
                  className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-(--grey-900) text-white transition-transform active:scale-90 disabled:opacity-50"
                >
                  <XIcon size={12} weight="bold" />
                </button>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <TextInput value={name} onChange={setName} placeholder="Name" autoFocus />
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                disabled={submitting}
                onChange={handleFile}
                aria-label="Choose a photo"
                className="text-xs text-(--grey-500) file:mr-2 file:rounded-[8px] file:border-0 file:bg-(--surface-150) file:px-2 file:py-1 file:text-xs file:text-(--grey-700)"
              />
            </div>
          </div>

          {arcs.length > 1 && (
            <Select value={arcId} onValueChange={setArcId} placeholder="Choose an arc">
              {arcs.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </Select>
          )}

          {/* Colour only ever shows through on the initials, so it's hidden once there
              is a photo — picking it then would change nothing visible. */}
          {!previewUrl && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-(--grey-500)">Bubble colour</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  aria-pressed={color === null}
                  title="Use the arc's colour"
                  style={{ backgroundColor: arc?.color ?? "var(--primary)" }}
                  className={
                    color === null
                      ? "h-6 w-6 shrink-0 rounded-full outline-2 outline-(--grey-900) outline-offset-2"
                      : "h-6 w-6 shrink-0 rounded-full opacity-60"
                  }
                />
                <ColorPicker palette={COLOR_PALETTE} value={color} onChange={setColor} />
              </div>
            </div>
          )}

          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => {
                // Two-step: deleting takes their touch history and slot values with them.
                if (confirmingDelete) void remove();
                else setConfirmingDelete(true);
              }}
              onBlur={() => setConfirmingDelete(false)}
              disabled={submitting}
              className={
                confirmingDelete
                  ? "flex min-h-11 items-center gap-2 self-start rounded-[10px] bg-(--red-500) px-3 text-sm font-medium text-white active:scale-95 disabled:opacity-50"
                  : "flex min-h-11 items-center gap-2 self-start rounded-[10px] px-3 text-sm text-(--grey-500) transition-colors hover:bg-(--surface-150) hover:text-(--red-500) disabled:opacity-50"
              }
            >
              <TrashIcon size={16} />
              {confirmingDelete ? "Delete them and their history?" : "Delete person"}
            </button>
          )}
        </div>
      }
      primaryButton={{
        label: isEdit ? "Save" : "Add",
        onClick: () => void submit(),
        loading: submitting,
        disabled: !name.trim() || !arcId,
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}

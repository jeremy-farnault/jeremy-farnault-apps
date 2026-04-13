"use client";

import { archiveNote, deleteNote, toggleNotePin } from "@/lib/actions";
import type { Folder, Note } from "@/lib/queries";
import { ActionModal, Tooltip, cn } from "@jf/ui";
import {
  ArchiveIcon,
  FolderOpenIcon,
  LinkIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoveNoteModal } from "./move-note-modal";

type Props = {
  note: Note;
  allFolders: Folder[];
  alwaysVisible?: boolean;
};

export function NoteActionsMenu({ note, allFolders, alwaysVisible }: Props) {
  const [modal, setModal] = useState<"move" | "delete" | "archive" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCopyLink() {
    navigator.clipboard
      .writeText(`${window.location.origin}/note/${note.id}`)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Failed to copy link"));
  }

  function handleTogglePin() {
    startTransition(async () => {
      try {
        await toggleNotePin(note.id);
        toast.success(note.pinned ? "Note unpinned" : "Note pinned");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleArchiveConfirm() {
    startTransition(async () => {
      try {
        await archiveNote(note.id);
        toast.success("Note archived");
        setModal(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      try {
        await deleteNote(note.id);
        toast.success("Note deleted");
        setModal(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const iconBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-150) hover:bg-(--surface-200) text-(--grey-700)";

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center gap-1 transition-opacity duration-150",
          alwaysVisible
            ? "opacity-100"
            : modal
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Tooltip content="Copy link">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy link"
            className={iconBtnClass}
          >
            <LinkIcon size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Move">
          <button
            type="button"
            onClick={() => setModal("move")}
            aria-label="Move"
            className={iconBtnClass}
          >
            <FolderOpenIcon size={14} />
          </button>
        </Tooltip>
        <Tooltip content={note.pinned ? "Unpin" : "Pin"}>
          <button
            type="button"
            onClick={handleTogglePin}
            disabled={isPending}
            aria-label={note.pinned ? "Unpin" : "Pin"}
            className={iconBtnClass}
          >
            {note.pinned ? <PushPinSlashIcon size={14} /> : <PushPinIcon size={14} />}
          </button>
        </Tooltip>
        <Tooltip content="Archive">
          <button
            type="button"
            onClick={() => setModal("archive")}
            aria-label="Archive"
            className={iconBtnClass}
          >
            <ArchiveIcon size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            type="button"
            onClick={() => setModal("delete")}
            aria-label="Delete"
            className={iconBtnClass}
          >
            <TrashIcon size={14} />
          </button>
        </Tooltip>
      </div>

      {modal === "move" && (
        <MoveNoteModal note={note} allFolders={allFolders} onClose={() => setModal(null)} />
      )}

      <ActionModal
        isOpen={modal === "archive"}
        onClose={() => setModal(null)}
        size="small"
        title="Archive note"
        paragraph="This will move the note to your archive."
        primaryButton={{
          label: "Archive",
          loading: isPending,
          onClick: handleArchiveConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setModal(null),
        }}
      />

      <ActionModal
        isOpen={modal === "delete"}
        onClose={() => setModal(null)}
        size="small"
        title="Delete note"
        paragraph={`Permanently delete "${note.title ?? "Untitled"}"? This cannot be undone.`}
        primaryButton={{
          label: "Delete",
          loading: isPending,
          onClick: handleDeleteConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setModal(null),
        }}
      />
    </>
  );
}

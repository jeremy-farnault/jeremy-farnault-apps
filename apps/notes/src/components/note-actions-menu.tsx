"use client";

import { archiveNote, deleteNote, toggleNotePin } from "@/lib/actions";
import type { Folder, Note } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import {
  ArchiveIcon,
  DotsThreeVerticalIcon,
  FolderOpenIcon,
  LinkIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoveNoteModal } from "./move-note-modal";

type Props = {
  note: Note;
  allFolders: Folder[];
  alwaysVisible?: boolean;
};

export function NoteActionsMenu({ note, allFolders, alwaysVisible }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"move" | "delete" | "archive" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleCopyLink() {
    setMenuOpen(false);
    navigator.clipboard
      .writeText(`${window.location.origin}/note/${note.id}`)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Failed to copy link"));
  }

  function handleTogglePin() {
    setMenuOpen(false);
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
        ref={menuRef}
        className="flex items-center"
        style={alwaysVisible ? undefined : { position: "relative" }}
      >
        {!alwaysVisible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            aria-label="Note actions"
            disabled={isPending}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-(--surface-150) text-(--grey-700)"
          >
            <DotsThreeVerticalIcon size={16} />
          </button>
        )}
        {(alwaysVisible || menuOpen) && (
          <div
            className={
              alwaysVisible
                ? "flex flex-row items-center gap-1"
                : "absolute right-full top-0 flex flex-row items-center gap-1 pr-1"
            }
          >
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Copy link"
              className={iconBtnClass}
            >
              <LinkIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("move");
              }}
              aria-label="Move"
              className={iconBtnClass}
            >
              <FolderOpenIcon size={14} />
            </button>
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={isPending}
              aria-label={note.pinned ? "Unpin" : "Pin"}
              className={iconBtnClass}
            >
              {note.pinned ? <PushPinSlashIcon size={14} /> : <PushPinIcon size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("archive");
              }}
              aria-label="Archive"
              className={iconBtnClass}
            >
              <ArchiveIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("delete");
              }}
              aria-label="Delete"
              className={iconBtnClass}
            >
              <TrashIcon size={14} />
            </button>
          </div>
        )}
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

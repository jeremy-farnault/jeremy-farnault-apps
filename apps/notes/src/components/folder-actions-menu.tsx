"use client";

import { archiveFolder, deleteFolder } from "@/lib/actions";
import type { Folder } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import {
  ArchiveIcon,
  DotsThreeVerticalIcon,
  FolderOpenIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { MoveFolderModal } from "./move-folder-modal";
import { RenameFolderModal } from "./rename-folder-modal";

type Props = {
  folder: Folder;
  allFolders: Folder[];
};

export function FolderActionsMenu({ folder, allFolders }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"rename" | "move" | "delete" | "archive" | null>(null);
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

  function handleArchiveConfirm() {
    startTransition(async () => {
      try {
        await archiveFolder(folder.id);
        toast.success("Folder archived");
        setModal(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      try {
        await deleteFolder(folder.id);
        toast.success("Folder deleted");
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
      <div ref={menuRef} className="flex items-center" style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          aria-label="Folder actions"
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-(--surface-150) text-(--grey-700)"
        >
          <DotsThreeVerticalIcon size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-full top-0 flex flex-row items-center gap-1 pr-1">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("rename");
              }}
              aria-label="Rename"
              className={iconBtnClass}
            >
              <PencilIcon size={14} />
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
              onClick={() => {
                setMenuOpen(false);
                setModal("archive");
              }}
              disabled={isPending}
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

      {modal === "rename" && <RenameFolderModal folder={folder} onClose={() => setModal(null)} />}
      {modal === "move" && (
        <MoveFolderModal folder={folder} allFolders={allFolders} onClose={() => setModal(null)} />
      )}

      <ActionModal
        isOpen={modal === "archive"}
        onClose={() => setModal(null)}
        size="small"
        title="Archive folder"
        paragraph="This will move the folder and its contents to your archive."
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
        title="Delete folder"
        paragraph={`Delete "${folder.name}" and all its contents? This cannot be undone.`}
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

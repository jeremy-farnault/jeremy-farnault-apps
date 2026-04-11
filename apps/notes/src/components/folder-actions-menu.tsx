"use client";

import { ArchiveIcon, DotsThreeVerticalIcon, FolderOpenIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Folder } from "@/lib/queries";
import { archiveFolder, deleteFolder } from "@/lib/actions";
import { toast } from "sonner";
import { ConfirmDialog } from "./confirm-dialog";
import { RenameFolderModal } from "./rename-folder-modal";
import { MoveFolderModal } from "./move-folder-modal";

type Props = {
  folder: Folder;
  allFolders: Folder[];
};

export function FolderActionsMenu({ folder, allFolders }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"rename" | "move" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    setMenuOpen(false);
    startTransition(async () => {
      try {
        await archiveFolder(folder.id);
        toast.success("Folder archived");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

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

  const iconBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-100) hover:bg-(--surface-150) text-(--grey-700)";

  return (
    <>
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          aria-label="Folder actions"
        >
          <DotsThreeVerticalIcon size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-full top-0 flex flex-row items-center gap-1 pr-1">
            <button type="button" onClick={() => { setMenuOpen(false); setModal("rename"); }} aria-label="Rename" className={iconBtnClass}>
              <PencilIcon size={14} />
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); setModal("move"); }} aria-label="Move" className={iconBtnClass}>
              <FolderOpenIcon size={14} />
            </button>
            <button type="button" onClick={handleArchive} disabled={isPending} aria-label="Archive" className={iconBtnClass}>
              <ArchiveIcon size={14} />
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); setModal("delete"); }} aria-label="Delete" className={iconBtnClass}>
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>
      {modal === "rename" && (
        <RenameFolderModal folder={folder} onClose={() => setModal(null)} />
      )}
      {modal === "move" && (
        <MoveFolderModal folder={folder} allFolders={allFolders} onClose={() => setModal(null)} />
      )}
      {modal === "delete" && (
        <ConfirmDialog
          message={`Delete "${folder.name}" and all its contents? This cannot be undone.`}
          onConfirm={async () => {
            try {
              await deleteFolder(folder.id);
              toast.success("Folder deleted");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Something went wrong");
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

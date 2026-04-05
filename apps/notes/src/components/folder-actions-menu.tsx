"use client";

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
          …
        </button>
        {menuOpen && (
          <div>
            <button type="button" onClick={() => { setMenuOpen(false); setModal("rename"); }}>
              Rename
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); setModal("move"); }}>
              Move
            </button>
            <button type="button" onClick={handleArchive} disabled={isPending}>
              Archive
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); setModal("delete"); }}>
              Delete
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

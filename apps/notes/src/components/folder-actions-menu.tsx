"use client";

import { useEffect, useRef, useState } from "react";
import type { Folder } from "@/lib/queries";
import { RenameFolderModal } from "./rename-folder-modal";
import { MoveFolderModal } from "./move-folder-modal";

type Props = {
  folder: Folder;
  allFolders: Folder[];
};

export function FolderActionsMenu({ folder, allFolders }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"rename" | "move" | null>(null);

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
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("rename");
              }}
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setModal("move");
              }}
            >
              Move
            </button>
          </div>
        )}
      </div>
      {modal === "rename" && (
        <RenameFolderModal folder={folder} onClose={() => setModal(null)} />
      )}
      {modal === "move" && (
        <MoveFolderModal
          folder={folder}
          allFolders={allFolders}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Folder, Note } from "@/lib/queries";
import { MoveNoteModal } from "./move-note-modal";

type Props = {
  note: Note;
  allFolders: Folder[];
};

export function NoteActionsMenu({ note, allFolders }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"move" | null>(null);

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
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
          aria-label="Note actions"
        >
          …
        </button>
        {menuOpen && (
          <div>
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
      {modal === "move" && (
        <MoveNoteModal
          note={note}
          allFolders={allFolders}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Note } from "@/lib/queries";
import { restoreNote, deleteNote } from "@/lib/actions";
import { toast } from "sonner";
import { ConfirmDialog } from "./confirm-dialog";

type Props = {
  note: Note;
};

export function ArchivedNoteCard({ note }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
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

  function handleRestore() {
    setMenuOpen(false);
    startTransition(async () => {
      try {
        await restoreNote(note.id);
        toast.success("Note restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", backgroundColor: note.backgroundColor ?? undefined, opacity: isPending ? 0.5 : 1 }}>
        <div style={{ flex: 1 }}>
          <p>{note.title ?? "Untitled"}</p>
          {note.body && <p>{note.body.slice(0, 100)}</p>}
        </div>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Note actions"
          >
            …
          </button>
          {menuOpen && (
            <div>
              <button type="button" onClick={handleRestore} disabled={isPending}>
                Restore
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setShowDelete(true); }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {showDelete && (
        <ConfirmDialog
          message={`Permanently delete "${note.title ?? "Untitled"}"? This cannot be undone.`}
          onConfirm={async () => {
            try {
              await deleteNote(note.id);
              toast.success("Note deleted");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Something went wrong");
            }
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

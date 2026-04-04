"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Folder, Note } from "@/lib/queries";
import { moveNote } from "@/lib/actions";
import { toast } from "sonner";

type Props = {
  note: Note;
  allFolders: Folder[];
  onClose: () => void;
};

export function MoveNoteModal({ note, allFolders, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function pick(newParentFolderId: string | null) {
    setError("");
    startTransition(async () => {
      try {
        await moveNote(note.id, newParentFolderId);
        toast.success("Note moved");
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <p>Move "{note.title ?? "Untitled"}" to…</p>
      {error && <p>{error}</p>}
      <ul>
        <li>
          <button type="button" onClick={() => pick(null)} disabled={isPending}>
            Root
          </button>
        </li>
        {allFolders.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => pick(f.id)}
              disabled={isPending}
            >
              {f.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancel
      </button>
    </dialog>
  );
}

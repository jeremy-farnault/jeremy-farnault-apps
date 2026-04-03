"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Folder } from "@/lib/queries";
import { renameFolder } from "@/lib/actions";

type Props = {
  folder: Folder;
  onClose: () => void;
};

export function RenameFolderModal({ folder, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await renameFolder(folder.id, name);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <p>Rename folder</p>
        {error && <p>{error}</p>}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <button type="button" onClick={onClose} disabled={isPending}>
          Cancel
        </button>
        <button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </dialog>
  );
}

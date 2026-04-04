"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Folder } from "@/lib/queries";
import { getDescendantIds } from "@/lib/folder-utils";
import { moveFolder } from "@/lib/actions";
import { toast } from "sonner";

type Props = {
  folder: Folder;
  allFolders: Folder[];
  onClose: () => void;
};

export function MoveFolderModal({ folder, allFolders, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const excludedIds = new Set(getDescendantIds(folder.id, allFolders));
  const allowed = allFolders.filter((f) => !excludedIds.has(f.id));

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function pick(newParentFolderId: string | null) {
    setError("");
    startTransition(async () => {
      try {
        await moveFolder(folder.id, newParentFolderId);
        toast.success("Folder moved");
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
      <p>Move "{folder.name}" to…</p>
      {error && <p>{error}</p>}
      <ul>
        <li>
          <button type="button" onClick={() => pick(null)} disabled={isPending}>
            Root
          </button>
        </li>
        {allowed.map((f) => (
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

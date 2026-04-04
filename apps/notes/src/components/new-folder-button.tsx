"use client";

import { useRef, useState, useTransition } from "react";
import { createFolder } from "@/lib/actions";
import { toast } from "sonner";

type Props = {
  parentFolderId: string | null;
};

export function NewFolderButton({ parentFolderId }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function open() {
    setName("");
    setError("");
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createFolder(parentFolderId, name);
        toast.success("Folder created");
        close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={open}>
        New folder
      </button>
      <dialog ref={dialogRef}>
        <form onSubmit={handleSubmit}>
          <p>New folder</p>
          {error && <p>{error}</p>}
          <input
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <button type="button" onClick={close} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create"}
          </button>
        </form>
      </dialog>
    </>
  );
}

"use client";

import { useEffect, useRef, useTransition } from "react";

type Props = {
  message: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({ message, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onClose();
    });
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <p>{message}</p>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancel
      </button>
      <button type="button" onClick={handleConfirm} disabled={isPending}>
        {isPending ? "Deleting…" : "Delete"}
      </button>
    </dialog>
  );
}

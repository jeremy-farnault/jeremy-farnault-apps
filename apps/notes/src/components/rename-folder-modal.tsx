"use client";

import { renameFolder } from "@/lib/actions";
import type { Folder } from "@/lib/queries";
import { ActionModal, TextInput } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  folder: Folder;
  onClose: () => void;
};

export function RenameFolderModal({ folder, onClose }: Props) {
  const [name, setName] = useState(folder.name);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await renameFolder(folder.id, name);
        toast.success("Folder renamed");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <ActionModal
      isOpen={true}
      onClose={onClose}
      size="small"
      title="Rename folder"
      content={<TextInput value={name} onChange={setName} placeholder="Folder name" />}
      primaryButton={{
        label: "Save",
        loading: isPending,
        onClick: handleConfirm,
      }}
      secondaryButton={{
        label: "Cancel",
        onClick: onClose,
      }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}

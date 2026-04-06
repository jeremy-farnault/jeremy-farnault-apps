"use client";

import { useState, useTransition } from "react";
import { ActionModal, TextInput } from "@jf/ui";
import { createFolder } from "@/lib/actions";
import { toast } from "sonner";

type Props = {
  parentFolderId: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function NewFolderButton({ parentFolderId, isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createFolder(parentFolderId, name);
        toast.success("Folder created");
        setName("");
        onClose();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        toast.error(message);
      }
    });
  }

  function handleClose() {
    setName("");
    onClose();
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={handleClose}
      size="small"
      title="New folder"
      content={
        <TextInput
          value={name}
          onChange={setName}
          placeholder="Folder name"
        />
      }
      primaryButton={{
        label: "Create",
        loading: isPending,
        onClick: handleSubmit,
      }}
      secondaryButton={{
        label: "Cancel",
        onClick: handleClose,
      }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}

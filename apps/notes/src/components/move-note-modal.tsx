"use client";

import { moveNote } from "@/lib/actions";
import type { Folder, Note } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FolderTree } from "./folder-tree";

type Props = {
  note: Note;
  allFolders: Folder[];
  onClose: () => void;
};

export function MoveNoteModal({ note, allFolders, onClose }: Props) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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
    <ActionModal
      isOpen={true}
      onClose={onClose}
      size="small"
      title={`Move "${note.title ?? "Untitled"}" to…`}
      content={
        <div>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <FolderTree
            folders={allFolders}
            currentParentFolderId={note.parentFolderId}
            onPick={pick}
            isPending={isPending}
          />
        </div>
      }
    />
  );
}

"use client";

import { moveFolder } from "@/lib/actions";
import { getDescendantIds } from "@/lib/folder-utils";
import type { Folder } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FolderTree } from "./folder-tree";

type Props = {
  folder: Folder;
  allFolders: Folder[];
  onClose: () => void;
};

export function MoveFolderModal({ folder, allFolders, onClose }: Props) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const excludedIds = new Set(getDescendantIds(folder.id, allFolders));
  const allowed = allFolders.filter((f) => !excludedIds.has(f.id));

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
    <ActionModal
      isOpen={true}
      onClose={onClose}
      size="small"
      title={`Move "${folder.name}" to…`}
      content={
        <div>
          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          <FolderTree
            folders={allowed}
            currentParentFolderId={folder.parentFolderId}
            onPick={pick}
            isPending={isPending}
          />
        </div>
      }
    />
  );
}

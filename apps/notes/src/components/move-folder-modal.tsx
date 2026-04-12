"use client";

import { moveFolder } from "@/lib/actions";
import { getDescendantIds } from "@/lib/folder-utils";
import type { Folder } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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

  const folderList = (
    <div className="flex flex-col gap-1 mt-1">
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <button
        type="button"
        onClick={() => pick(null)}
        disabled={isPending}
        className="w-full rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) hover:bg-(--surface-150) disabled:opacity-50 transition-colors"
      >
        Home
      </button>
      {allowed.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => pick(f.id)}
          disabled={isPending}
          className="w-full rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) hover:bg-(--surface-150) disabled:opacity-50 transition-colors"
        >
          {f.name}
        </button>
      ))}
    </div>
  );

  return (
    <ActionModal
      isOpen={true}
      onClose={onClose}
      size="small"
      title={`Move "${folder.name}" to…`}
      content={folderList}
    />
  );
}

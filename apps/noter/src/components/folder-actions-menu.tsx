"use client";

import { archiveFolder, deleteFolder } from "@/lib/actions";
import type { Folder } from "@/lib/queries";
import { ActionModal, Tooltip, cn } from "@jf/ui";
import { ArchiveIcon, FolderOpenIcon, PencilIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoveFolderModal } from "./move-folder-modal";
import { RenameFolderModal } from "./rename-folder-modal";

type Props = {
  folder: Folder;
  allFolders: Folder[];
  menuVisible?: boolean;
};

export function FolderActionsMenu({ folder, allFolders, menuVisible }: Props) {
  const [modal, setModal] = useState<"rename" | "move" | "delete" | "archive" | null>(null);
  const shouldMount = modal !== null || (menuVisible ?? true);
  const [isPending, startTransition] = useTransition();

  function handleArchiveConfirm() {
    startTransition(async () => {
      try {
        await archiveFolder(folder.id);
        toast.success("Folder archived");
        setModal(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      try {
        await deleteFolder(folder.id);
        toast.success("Folder deleted");
        setModal(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const iconBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-150) hover:bg-(--surface-200) text-(--grey-700)";

  return (
    <>
      {shouldMount && (
        <div
          className={cn(
            "flex flex-row items-center gap-1 transition-opacity duration-150",
            modal
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Tooltip content="Rename">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModal("rename");
              }}
              aria-label="Rename"
              className={iconBtnClass}
            >
              <PencilIcon size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Move">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModal("move");
              }}
              aria-label="Move"
              className={iconBtnClass}
            >
              <FolderOpenIcon size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Archive">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModal("archive");
              }}
              disabled={isPending}
              aria-label="Archive"
              className={iconBtnClass}
            >
              <ArchiveIcon size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setModal("delete");
              }}
              aria-label="Delete"
              className={iconBtnClass}
            >
              <TrashIcon size={14} />
            </button>
          </Tooltip>
        </div>
      )}

      {modal === "rename" && <RenameFolderModal folder={folder} onClose={() => setModal(null)} />}
      {modal === "move" && (
        <MoveFolderModal folder={folder} allFolders={allFolders} onClose={() => setModal(null)} />
      )}

      <ActionModal
        isOpen={modal === "archive"}
        onClose={() => setModal(null)}
        size="small"
        title="Archive folder"
        paragraph="This will move the folder and its contents to your archive."
        primaryButton={{
          label: "Archive",
          loading: isPending,
          onClick: handleArchiveConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setModal(null),
        }}
      />

      <ActionModal
        isOpen={modal === "delete"}
        onClose={() => setModal(null)}
        size="small"
        title="Delete folder"
        paragraph={`Delete "${folder.name}" and all its contents? This cannot be undone.`}
        primaryButton={{
          label: "Delete",
          loading: isPending,
          onClick: handleDeleteConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setModal(null),
        }}
      />
    </>
  );
}

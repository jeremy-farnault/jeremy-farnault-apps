"use client";

import { ActionModal, Tooltip } from "@jf/ui";
import { ArchiveIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { ClasserCardData } from "./classer-card";

type Props = {
  classer: ClasserCardData;
  menuVisible?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ClasserActionsMenu({ classer, menuVisible, onEdit, onArchive, onDelete }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const shouldMount = deleteOpen || (menuVisible ?? true);

  return (
    <>
      {shouldMount && (
        <div
          className={
            deleteOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity duration-150"
          }
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <Tooltip content="Edit">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit classer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
              >
                <PencilSimpleIcon size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Archive">
              <button
                type="button"
                onClick={onArchive}
                aria-label="Archive classer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
              >
                <ArchiveIcon size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Delete">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete classer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
              >
                <TrashIcon size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <ActionModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="small"
        title="Delete classer"
        paragraph={`Permanently delete "${classer.name}"? This cannot be undone.`}
        primaryButton={{
          label: "Delete",
          onClick: () => {
            setDeleteOpen(false);
            onDelete();
          },
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setDeleteOpen(false),
        }}
      />
    </>
  );
}

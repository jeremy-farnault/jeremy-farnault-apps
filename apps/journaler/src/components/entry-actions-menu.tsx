"use client";

import type { CardEntry } from "./entry-card";
import { ActionModal, Tooltip, cn } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  entry: CardEntry;
  menuVisible?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function EntryActionsMenu({ entry, menuVisible, onEdit, onDelete }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const shouldMount = deleteOpen || (menuVisible ?? true);

  const iconBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-150) hover:bg-(--surface-200) text-(--grey-700)";

  return (
    <>
      {shouldMount && (
        <div
          className={cn(
            "flex flex-row items-center gap-1 transition-opacity duration-150",
            deleteOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Tooltip content="Edit">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit entry"
              className={iconBtnClass}
            >
              <PencilSimpleIcon size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete entry"
              className={iconBtnClass}
            >
              <TrashIcon size={14} />
            </button>
          </Tooltip>
        </div>
      )}

      <ActionModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="small"
        title="Delete entry"
        paragraph={`Permanently delete "${entry.title}"? This cannot be undone.`}
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

"use client";

import { ActionModal, Tooltip } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { ItemCardData } from "./item-card";

type Props = {
  item: ItemCardData;
  menuVisible?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function ItemActionsMenu({ item, menuVisible, onEdit, onDelete }: Props) {
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
                aria-label="Edit item"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
              >
                <PencilSimpleIcon size={14} />
              </button>
            </Tooltip>
            <Tooltip content="Delete">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete item"
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
        title="Delete item"
        paragraph={`Permanently delete "${item.name}"? This cannot be undone.`}
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

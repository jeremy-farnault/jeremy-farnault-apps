"use client";

import type { CardEntry } from "./entry-card";
import { ActionModal, Tooltip } from "@jf/ui";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  entry: CardEntry;
  menuVisible?: boolean;
  onDelete: () => void;
};

export function EntryActionsMenu({ entry, menuVisible, onDelete }: Props) {
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
          <Tooltip content="Delete">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete entry"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
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

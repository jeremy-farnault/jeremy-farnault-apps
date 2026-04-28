"use client";

import { ActionModal, Tooltip } from "@jf/ui";
import { ArchiveIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { ClasserCardData } from "./classer-card";

type Props = {
  classer: ClasserCardData;
  menuVisible?: boolean;
  onEdit: () => void;
  onArchive: () => void;
};

export function ClasserActionsMenu({ classer, menuVisible, onEdit, onArchive }: Props) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const shouldMount = archiveOpen || (menuVisible ?? true);

  return (
    <>
      {shouldMount && (
        <div
          className={
            archiveOpen
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
                onClick={() => setArchiveOpen(true)}
                aria-label="Archive classer"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
              >
                <ArchiveIcon size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <ActionModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        size="small"
        title="Archive classer"
        paragraph={`Archive "${classer.name}"? It will be hidden from your list and can be restored later.`}
        primaryButton={{
          label: "Archive",
          onClick: () => {
            setArchiveOpen(false);
            onArchive();
          },
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setArchiveOpen(false),
        }}
      />
    </>
  );
}

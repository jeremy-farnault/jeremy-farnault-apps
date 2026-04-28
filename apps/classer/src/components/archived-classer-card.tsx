"use client";

import { Tooltip } from "@jf/ui";
import { ArrowCounterClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import type { ClasserCardData } from "./classer-card";

type Props = {
  classer: ClasserCardData;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ArchivedClasserCard({ classer, onRestore, onDelete }: Props) {
  const hasImage = classer.imageUrl !== null;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[22px] h-[200px]">
      <div
        className="relative flex-[2]"
        style={
          hasImage
            ? {
                backgroundImage: `url(${classer.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: "var(--green-400)" }
        }
      >
        {hasImage && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        )}
      </div>

      <div className="relative flex flex-col justify-center gap-1 px-3 py-2.5 bg-(--surface-200)">
        <p className="text-sm font-semibold truncate text-(--grey-900)">{classer.name}</p>
        <div className="flex items-center justify-end">
          <span className="text-xs text-(--grey-600) shrink-0">
            {classer.itemCount} {classer.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        <Tooltip content="Restore">
          <button
            type="button"
            onClick={() => onRestore(classer.id)}
            aria-label="Restore classer"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
          >
            <ArrowCounterClockwiseIcon size={14} />
          </button>
        </Tooltip>
        <Tooltip content="Delete">
          <button
            type="button"
            onClick={() => onDelete(classer.id)}
            aria-label="Delete classer"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) hover:bg-(--grey-700) text-white"
          >
            <TrashIcon size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

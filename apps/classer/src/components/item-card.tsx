"use client";

import { ActionModal } from "@jf/ui";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

export type ItemCardData = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  rank: number;
};

type Props = {
  item: ItemCardData;
  totalCount: number;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ItemCard({ item, totalCount, onUp, onDown, onEdit, onDelete }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <li
        className="group relative flex h-[96px] cursor-pointer overflow-hidden rounded-2xl bg-(--surface-100)"
        onClick={onEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onEdit();
        }}
      >
        {/* Left: thumbnail */}
        <div className="w-[120px] shrink-0 overflow-hidden md:w-40">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-(--green-400)" />
          )}
        </div>

        {/* Center: rank + name + description */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
          <span className="mb-0.5 w-fit rounded-md px-1.5 py-0.5 text-xs font-bold text-(--grey-900) bg-(--green-400)">
            #{item.rank}
          </span>
          <p className="truncate text-sm font-semibold text-(--grey-900)">{item.name}</p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-(--grey-500)">{item.description}</p>
          )}
        </div>

        {/* Right: up / down */}
        <div
          className="flex shrink-0 flex-col items-center justify-between py-3 pl-2 pr-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onUp}
            disabled={item.rank === 1}
            aria-label="Move up"
            className="flex h-6 w-6 items-center justify-center rounded-full text-(--grey-900) transition-colors hover:bg-(--surface-200) disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUpIcon size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onDown}
            disabled={item.rank === totalCount}
            aria-label="Move down"
            className="flex h-6 w-6 items-center justify-center rounded-full text-(--grey-900) transition-colors hover:bg-(--surface-200) disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDownIcon size={14} weight="bold" />
          </button>
        </div>

        {/* Delete — bottom-left over image, hover-reveal */}
        <div
          className={`absolute bottom-2 left-2 transition-opacity duration-150 ${deleteOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete item"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-(--grey-900) text-white transition-colors hover:bg-(--grey-700)"
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </li>

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

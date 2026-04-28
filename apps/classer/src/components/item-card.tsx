"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ItemActionsMenu } from "./item-actions-menu";

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
  const [menuVisible, setMenuVisible] = useState(false);
  const hasImage = item.imageUrl !== null;

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) setMenuVisible(true);
  }, []);

  return (
    <li
      className="group relative flex h-[160px] overflow-hidden rounded-[22px]"
      onMouseEnter={() => setMenuVisible(true)}
      onMouseLeave={() => setMenuVisible(false)}
    >
      {/* Full-bleed background */}
      <div
        className="absolute inset-0"
        style={
          hasImage
            ? {
                backgroundImage: `url(${item.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: "var(--green-400)" }
        }
      />

      {/* Gradient scrim for images — left-to-right, behind left column text */}
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      )}

      {/* Left column: up / rank / down */}
      <div className="relative z-10 flex w-14 shrink-0 flex-col items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={onUp}
          disabled={item.rank === 1}
          aria-label="Move up"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowUpIcon size={14} weight="bold" />
        </button>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-(--grey-900)">
          {item.rank}
        </span>

        <button
          type="button"
          onClick={onDown}
          disabled={item.rank === totalCount}
          aria-label="Move down"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowDownIcon size={14} weight="bold" />
        </button>
      </div>

      {/* Right content: name + description anchored to bottom */}
      <div className="relative z-10 flex flex-1 flex-col justify-end pb-3 pr-3">
        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-white/80">{item.description}</p>
        )}
      </div>

      {/* Action menu — top-right, hover-reveal */}
      <div className="absolute right-2 top-2 z-20">
        <ItemActionsMenu
          item={item}
          menuVisible={menuVisible}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}

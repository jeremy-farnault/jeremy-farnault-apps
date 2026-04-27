"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClasserActionsMenu } from "./classer-actions-menu";

export type ClasserCardData = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  itemCount: number;
};

type Props = {
  classer: ClasserCardData;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

export function ClasserCard({ classer, onEdit, onArchive, onDelete }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const hasImage = classer.imageUrl !== null;

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) setMenuVisible(true);
  }, []);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[22px] h-[200px]"
      onMouseEnter={() => setMenuVisible(true)}
      onMouseLeave={() => setMenuVisible(false)}
    >
      <Link
        href={`/${classer.id}`}
        aria-label={classer.name}
        className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-2 rounded-[22px]"
      />

      {/* Top 2/3: image or green accent */}
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

      {/* Bottom 1/3: info area */}
      <div className="relative flex flex-col justify-center gap-1 px-3 py-2.5 bg-(--surface-200)">
        <p className="text-sm font-semibold truncate text-(--grey-900)">{classer.name}</p>
        <div className="flex items-center justify-end">
          <span className="text-xs text-(--grey-600) shrink-0">
            {classer.itemCount} {classer.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Actions menu — absolutely positioned, no layout impact */}
      <div className="absolute top-2 right-2 z-20">
        <ClasserActionsMenu
          classer={classer}
          menuVisible={menuVisible}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

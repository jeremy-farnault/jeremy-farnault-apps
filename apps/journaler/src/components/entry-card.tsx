"use client";

import { CATEGORY_COLORS } from "@/lib/category-colors";
import { cn } from "@jf/ui";
import { useEffect, useState } from "react";
import { EntryActionsMenu } from "./entry-actions-menu";

export type CardEntry = {
  id: string;
  title: string;
  category: "Movie" | "TV Show" | "Book" | "Game" | "Manga";
  date: string;
  comment: string | null;
  rating: number | null;
  imageUrl: string | null;
  imageKey: string | null;
};

type Props = {
  entry: CardEntry;
  onEdit: (entry: CardEntry) => void;
  onDelete: (entry: CardEntry) => void;
};

export function EntryCard({ entry, onEdit, onDelete }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const hasImage = entry.imageUrl !== null;

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) setMenuVisible(true);
  }, []);

  return (
    <div
      className="group relative flex h-[200px] flex-col overflow-hidden rounded-[22px]"
      style={
        hasImage
          ? {
              backgroundImage: `url(${entry.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: CATEGORY_COLORS[entry.category] }
      }
      onMouseEnter={() => setMenuVisible(true)}
      onMouseLeave={() => setMenuVisible(false)}
    >
      <button
        type="button"
        aria-label={`Edit ${entry.title}`}
        onClick={() => onEdit(entry)}
        className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded-[22px]"
      />

      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      )}

      <div className="relative mt-auto flex flex-col gap-1 p-4">
        <p
          className={cn(
            "text-base font-semibold truncate",
            hasImage ? "text-white" : "text-(--grey-900)"
          )}
        >
          {entry.title}
        </p>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              hasImage
                ? "bg-white/20 text-white"
                : "bg-(--surface-150) text-(--grey-700)"
            )}
          >
            {entry.category}
          </span>
          <EntryActionsMenu
            entry={entry}
            menuVisible={menuVisible}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry)}
          />
        </div>
      </div>
    </div>
  );
}

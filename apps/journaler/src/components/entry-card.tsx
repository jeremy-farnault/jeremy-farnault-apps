"use client";

import { CATEGORY_COLORS } from "@/lib/category-colors";
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
      className="group relative flex flex-col overflow-hidden rounded-[22px] h-[200px]"
      onMouseEnter={() => setMenuVisible(true)}
      onMouseLeave={() => setMenuVisible(false)}
    >
      <button
        type="button"
        aria-label={`Edit ${entry.title}`}
        onClick={() => onEdit(entry)}
        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 rounded-[22px]"
      />

      {/* Top 2/3: image or category color */}
      <div
        className="relative flex-[2]"
        style={
          hasImage
            ? {
                backgroundImage: `url(${entry.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: CATEGORY_COLORS[entry.category] }
        }
      >
        {hasImage && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        )}
      </div>

      {/* Bottom 1/3: info area */}
      <div className="relative flex flex-col justify-center gap-1 px-3 py-2.5 bg-(--surface-200)">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate text-(--grey-900)">{entry.title}</p>
          {entry.rating !== null && (
            <span className="text-sm font-semibold text-(--grey-600) shrink-0">{entry.rating}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
          >
            {entry.category}
          </span>
          <span className="text-xs text-(--grey-600) shrink-0">{entry.date.slice(0, 10)}</span>
        </div>
      </div>

      {/* Delete button — absolutely positioned, no layout impact */}
      <div className="absolute top-2 right-2 z-20">
        <EntryActionsMenu
          entry={entry}
          menuVisible={menuVisible}
          onDelete={() => onDelete(entry)}
        />
      </div>
    </div>
  );
}

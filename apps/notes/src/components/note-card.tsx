"use client";

import type { Folder, Note } from "@/lib/queries";
import { cn } from "@jf/ui";
import { FolderIcon, PushPinIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";
import { NoteActionsMenu } from "./note-actions-menu";

function getBorderColor(color: string): string {
  return color.replace("-400)", "-600)");
}

type Props = {
  note: Note;
  allFolders: Folder[];
  onNoteClick: (note: Note) => void;
  showFolderLink?: boolean;
  parentFolderId?: string | null;
  onFolderLinkClick?: () => void;
};

export function NoteCard({
  note,
  allFolders,
  onNoteClick,
  showFolderLink,
  parentFolderId,
  onFolderLinkClick,
}: Props) {
  const bgColor = note.backgroundColor ?? "var(--grey-400)";
  const borderColor = getBorderColor(bgColor);
  const pointerDownOnCard = useRef(false);

  return (
    <button
      type="button"
      onPointerDown={() => { pointerDownOnCard.current = true; }}
      onClick={() => {
        if (!pointerDownOnCard.current) return;
        pointerDownOnCard.current = false;
        onNoteClick(note);
      }}
      className={cn(
        "group relative flex h-[150px] flex-col rounded-[22px] border p-4 text-left cursor-pointer",
        "hover:brightness-95 transition-[filter] duration-300 ease-in-out",
        note.pinned ? "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]" : "shadow-sm"
      )}
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div className="flex-1 flex flex-col justify-start overflow-hidden w-full">
        {note.title && (
          <div className="mb-1 flex items-center gap-1 min-w-0 w-full">
            {note.pinned && <PushPinIcon size={14} className="shrink-0" />}
            <span className="text-base font-semibold text-(--grey-900) truncate">{note.title}</span>
          </div>
        )}
        {note.body && (
          <p className="text-sm text-(--grey-700) line-clamp-2 whitespace-pre-line">{note.body}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 mt-2">
        <NoteActionsMenu note={note} allFolders={allFolders} />
        {showFolderLink && (
          <Link
            href={parentFolderId ? `/${parentFolderId}` : "/"}
            onClick={(e) => {
              e.stopPropagation();
              onFolderLinkClick?.();
            }}
            aria-label="Go to folder"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-(--surface-150) text-(--grey-700)"
          >
            <FolderIcon size={16} />
          </Link>
        )}
      </div>
    </button>
  );
}

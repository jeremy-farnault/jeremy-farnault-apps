"use client";

import { deleteNote, restoreNote } from "@/lib/actions";
import type { Note } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import { ArrowCounterClockwiseIcon, DotsThreeVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  note: Note;
};

function getBorderColor(color: string): string {
  return color.replace("-400)", "-600)");
}

export function ArchivedNoteCard({ note }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bgColor = note.backgroundColor ?? "var(--grey-400)";
  const borderColor = getBorderColor(bgColor);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleRestore() {
    setMenuOpen(false);
    startTransition(async () => {
      try {
        await restoreNote(note.id);
        toast.success("Note restored");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const iconBtnClass =
    "flex h-7 w-7 items-center justify-center rounded-lg bg-(--surface-150) hover:bg-(--surface-200) text-(--grey-700)";

  return (
    <>
      <div
        className="relative flex h-[150px] flex-col rounded-[22px] border p-4 shadow-sm"
        style={{ backgroundColor: bgColor, borderColor, opacity: isPending ? 0.5 : 1 }}
      >
        <div className="flex-1 overflow-hidden">
          {note.title && (
            <div className="mb-1 min-w-0 w-full">
              <span className="text-base font-semibold text-(--grey-900) truncate block">
                {note.title}
              </span>
            </div>
          )}
          {note.body && (
            <p className="text-sm text-(--grey-700) line-clamp-3 whitespace-pre-line">
              {note.body}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <div ref={menuRef} className="flex items-center" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((o) => !o);
              }}
              aria-label="Note actions"
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-(--surface-150) text-(--grey-700)"
            >
              <DotsThreeVerticalIcon size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-full top-0 flex flex-row items-center gap-1 pr-1">
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={isPending}
                  aria-label="Restore"
                  className={iconBtnClass}
                >
                  <ArrowCounterClockwiseIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDelete(true);
                  }}
                  aria-label="Delete"
                  className={iconBtnClass}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActionModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        size="small"
        title="Delete note"
        paragraph={`Permanently delete "${note.title ?? "Untitled"}"? This cannot be undone.`}
        primaryButton={{
          label: "Delete",
          loading: isPending,
          onClick: () => {
            startTransition(async () => {
              try {
                await deleteNote(note.id);
                toast.success("Note deleted");
                setShowDelete(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong");
              }
            });
          },
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setShowDelete(false),
        }}
      />
    </>
  );
}

"use client";

import { deleteFolder, restoreFolder } from "@/lib/actions";
import type { Folder } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import {
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  FolderIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  folder: Folder;
};

export function ArchivedFolderCard({ folder }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        await restoreFolder(folder.id);
        toast.success("Folder restored");
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
        className="relative flex h-[150px] flex-col rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4 shadow-sm hover:bg-(--surface-200)"
        style={{ opacity: isPending ? 0.5 : 1 }}
      >
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2">
            <FolderIcon size={20} className="shrink-0 text-(--grey-700)" />
            <span className="text-sm font-semibold text-(--grey-900) truncate">{folder.name}</span>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <div ref={menuRef} className="flex items-center" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((o) => !o);
              }}
              aria-label="Folder actions"
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-(--surface-200) text-(--grey-700)"
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
        title="Delete folder"
        paragraph={`Permanently delete "${folder.name}" and all its contents? This cannot be undone.`}
        primaryButton={{
          label: "Delete",
          loading: isPending,
          onClick: () => {
            startTransition(async () => {
              try {
                await deleteFolder(folder.id);
                toast.success("Folder deleted");
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

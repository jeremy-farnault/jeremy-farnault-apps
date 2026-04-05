"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Folder } from "@/lib/queries";
import { restoreFolder, deleteFolder } from "@/lib/actions";
import { toast } from "sonner";
import { ConfirmDialog } from "./confirm-dialog";

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
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
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

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", opacity: isPending ? 0.5 : 1 }}>
        <div style={{ flex: 1 }}>
          <p>{folder.name}</p>
        </div>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Folder actions"
          >
            …
          </button>
          {menuOpen && (
            <div>
              <button type="button" onClick={handleRestore} disabled={isPending}>
                Restore
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setShowDelete(true); }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {showDelete && (
        <ConfirmDialog
          message={`Permanently delete "${folder.name}" and all its contents? This cannot be undone.`}
          onConfirm={async () => {
            try {
              await deleteFolder(folder.id);
              toast.success("Folder deleted");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Something went wrong");
            }
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

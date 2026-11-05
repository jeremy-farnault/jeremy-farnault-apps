"use client";

import type { Folder, Note } from "@/lib/queries";
import { createContext, useContext } from "react";

export type GridItems = { folders: Folder[]; notes: Note[] };

export type ItemsAction =
  | { type: "toggle-pin"; noteId: string }
  | { type: "remove-note"; noteId: string }
  | { type: "remove-folder"; folderId: string };

/** Reducer for `useOptimistic`: the grid shows the change before the server confirms it. */
export function applyItemsAction(items: GridItems, action: ItemsAction): GridItems {
  switch (action.type) {
    case "toggle-pin":
      return {
        ...items,
        notes: items.notes.map((n) => (n.id === action.noteId ? { ...n, pinned: !n.pinned } : n)),
      };
    case "remove-note":
      return { ...items, notes: items.notes.filter((n) => n.id !== action.noteId) };
    case "remove-folder":
      return { ...items, folders: items.folders.filter((f) => f.id !== action.folderId) };
  }
}

/**
 * Lets a card's action menu update the grid optimistically. Must be called inside a
 * transition. Outside a grid (the note page) it does nothing.
 */
export const OptimisticItemsContext = createContext<(action: ItemsAction) => void>(() => {});

export function useOptimisticItems() {
  return useContext(OptimisticItemsContext);
}

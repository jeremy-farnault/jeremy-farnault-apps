"use client";

import { create } from "zustand";

type SelectionState = {
  pendingSelectionId: string | null;
  pendingCharacterFocusNonce: number;
  requestSelection: (id: string) => void;
  requestCharacterFocus: () => void;
  clearPending: () => void;
};

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  pendingSelectionId: null,
  pendingCharacterFocusNonce: 0,
  requestSelection: (id) => set({ pendingSelectionId: id }),
  requestCharacterFocus: () =>
    set({ pendingCharacterFocusNonce: get().pendingCharacterFocusNonce + 1 }),
  clearPending: () => set({ pendingSelectionId: null }),
}));

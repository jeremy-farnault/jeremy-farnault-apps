"use client";

import { create } from "zustand";

type SelectionState = {
  pendingSelectionId: string | null;
  requestSelection: (id: string) => void;
  clearPending: () => void;
};

export const useSelectionStore = create<SelectionState>()((set) => ({
  pendingSelectionId: null,
  requestSelection: (id) => set({ pendingSelectionId: id }),
  clearPending: () => set({ pendingSelectionId: null }),
}));

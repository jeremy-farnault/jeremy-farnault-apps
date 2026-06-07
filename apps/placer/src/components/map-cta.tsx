"use client";

import { CategoryModal } from "@/components/category-modal";
import type { CategoryRow } from "@/lib/queries";
import { PlusCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface MapCtaProps {
  categories: CategoryRow[];
}

export function MapCta({ categories }: MapCtaProps) {
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  return (
    <>
      <div
        className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
        style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <button
          type="button"
          onClick={() => setCategoryModalOpen(true)}
          aria-label="Add category"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <PlusCircleIcon size={22} />
        </button>
      </div>

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
      />
    </>
  );
}

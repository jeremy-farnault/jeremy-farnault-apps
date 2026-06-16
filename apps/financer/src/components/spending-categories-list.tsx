"use client";

import { deleteSpendingCategory, updateSpendingCategory } from "@/lib/actions";
import { SPENDING_CATEGORY_COLORS } from "@/lib/constants";
import type { SpendingCategoryRow } from "@/lib/queries";
import { ActionModal, TextInput } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface SpendingCategoriesListProps {
  categories: SpendingCategoryRow[];
}

export function SpendingCategoriesList({ categories }: SpendingCategoriesListProps) {
  const [editingCategory, setEditingCategory] = useState<SpendingCategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<SpendingCategoryRow | null>(null);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function openEdit(category: SpendingCategoryRow) {
    setEditingCategory(category);
    setName(category.name);
  }

  function handleEditClose() {
    setEditingCategory(null);
    setName("");
  }

  function handleEditSubmit() {
    if (!editingCategory || !name.trim()) return;
    startTransition(async () => {
      try {
        await updateSpendingCategory(editingCategory.id, { name });
        toast.success("Category updated");
        handleEditClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deletingCategory) return;
    startTransition(async () => {
      try {
        await deleteSpendingCategory(deletingCategory.id);
        toast.success("Category deleted");
        setDeletingCategory(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (categories.length === 0) {
    return <p className="text-sm text-(--grey-500)">No custom categories yet.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.map((category, index) => {
          const effectiveColor =
            category.color ??
            SPENDING_CATEGORY_COLORS[index % SPENDING_CATEGORY_COLORS.length] ??
            "var(--grey-400)";
          return (
            <li
              key={category.id}
              style={{ borderLeft: `4px solid ${effectiveColor}` }}
              className="flex items-center gap-2 rounded-[12px] bg-(--surface-100) p-3"
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: "50%",
                  backgroundColor: effectiveColor,
                }}
              />
              <span className="flex-1 truncate text-sm font-medium text-(--grey-900)">
                {category.name}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => openEdit(category)}
                  aria-label="Edit category"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                >
                  <PencilSimpleIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingCategory(category)}
                  aria-label="Delete category"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ActionModal
        isOpen={!!editingCategory}
        onClose={handleEditClose}
        size="small"
        title="Edit category"
        content={<TextInput value={name} onChange={setName} placeholder="Name" />}
        primaryButton={{ label: "Save", loading: isPending, onClick: handleEditSubmit }}
        secondaryButton={{ label: "Cancel", onClick: handleEditClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />

      <ActionModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        size="small"
        title="Delete category?"
        content={
          <div className="flex flex-col gap-2">
            <p className="text-sm text-(--grey-700)">
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingCategory?.name}</span>?
            </p>
            {deletingCategory?.hasEntries && (
              <p className="text-sm text-red-500">
                This category has transactions assigned to it and cannot be deleted.
              </p>
            )}
          </div>
        }
        primaryButton={{ label: "Delete", loading: isPending, onClick: handleDeleteConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeletingCategory(null) }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

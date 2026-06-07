"use client";

import { createCategory, deleteCategory } from "@/lib/actions";
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_COLOR,
  DEFAULT_CATEGORY_ICON,
  PLACER_COLOR_PALETTE,
} from "@/lib/constants";
import type { CategoryRow } from "@/lib/queries";
import { ActionModal, ColorPicker, TextInput } from "@jf/ui";
import { TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryRow[];
}

export function CategoryModal({ isOpen, onClose, categories }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null);
  const [isAddPending, startAddTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function handleClose() {
    onClose();
    setName("");
    setNameError(undefined);
    setColor(DEFAULT_CATEGORY_COLOR);
    setIcon(DEFAULT_CATEGORY_ICON);
  }

  function handleAdd() {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    startAddTransition(async () => {
      try {
        await createCategory({ name, color, icon });
        toast.success("Category added");
        setName("");
        setNameError(undefined);
        setColor(DEFAULT_CATEGORY_COLOR);
        setIcon(DEFAULT_CATEGORY_ICON);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deletingCategory) return;
    startDeleteTransition(async () => {
      try {
        await deleteCategory(deletingCategory.id);
        toast.success("Category deleted");
        setDeletingCategory(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <ActionModal
        isOpen={isOpen}
        onClose={handleClose}
        size="small"
        title="Add Category"
        closeOnBackdropClick={!isAddPending}
        closeOnEscapeKeyDown={!isAddPending}
        content={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <TextInput
                  value={name}
                  onChange={(v) => {
                    setName(v);
                    setNameError(undefined);
                  }}
                  placeholder="Name"
                />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-(--grey-500)">Color</p>
                <ColorPicker palette={PLACER_COLOR_PALETTE} value={color} onChange={setColor} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-(--grey-500)">Icon</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_ICONS).map(([key, IconComp]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      aria-label={key}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        icon === key
                          ? "bg-(--primary) text-(--primary-foreground)"
                          : "text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                      }`}
                    >
                      <IconComp size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <>
                <div className="h-px bg-(--border)" />
                <ul className="flex flex-col gap-1">
                  {categories.map((cat) => {
                    const IconComp = CATEGORY_ICONS[cat.icon];
                    return (
                      <li key={cat.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: cat.color }}
                        >
                          {IconComp && <IconComp size={14} className="text-white" />}
                        </span>
                        <span className="flex-1 truncate text-sm text-(--grey-900)">
                          {cat.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat)}
                          aria-label={`Delete ${cat.name}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        }
        primaryButton={{ label: "Add", loading: isAddPending, onClick: handleAdd }}
        secondaryButton={{ label: "Cancel", onClick: handleClose }}
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
            <p className="text-sm text-(--grey-500)">
              This category will be removed. Its spots will become uncategorized.
            </p>
          </div>
        }
        primaryButton={{ label: "Delete", loading: isDeletePending, onClick: handleDeleteConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeletingCategory(null) }}
        closeOnBackdropClick={!isDeletePending}
        closeOnEscapeKeyDown={!isDeletePending}
      />
    </>
  );
}

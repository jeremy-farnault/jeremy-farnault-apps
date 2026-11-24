"use client";

import { createSpendingCategory, createSpendingEntries } from "@/lib/actions";
import { CURRENCIES, SPENDING_CATEGORIES } from "@/lib/constants";
import type { SpendingCategoryRow } from "@/lib/queries";
import { parseQuickEntry } from "@/lib/quick-entry";
import { ActionModal, Select, SelectItem, TextInput } from "@jf/ui";
import { MinusIcon, PlusCircleIcon, PlusIcon, ReceiptIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface SpendingCtaProps {
  viewedMonth: string;
  homeCurrency: string;
  customCategories: SpendingCategoryRow[];
}

type SpendingLogRow = { value: string; category: string; currency: string };

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function SpendingCta({ viewedMonth, homeCurrency, customCategories }: SpendingCtaProps) {
  const [open, setOpen] = useState(false);
  // Rows come from the quick-entry line (or Add row): the modal opens with none.
  const [rows, setRows] = useState<SpendingLogRow[]>([]);
  const [rowErrors, setRowErrors] = useState<(string | undefined)[]>([]);
  const [quickLine, setQuickLine] = useState("");
  const [isPending, startTransition] = useTransition();

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddCategoryPending, startAddCategoryTransition] = useTransition();

  const allCategories = [...SPENDING_CATEGORIES, ...customCategories.map((c) => c.name)].sort(
    (a, b) => a.localeCompare(b)
  );

  function handleAddCategoryClose() {
    setAddCategoryOpen(false);
    setNewCategoryName("");
  }

  function handleAddCategorySubmit() {
    if (!newCategoryName.trim()) return;
    startAddCategoryTransition(async () => {
      try {
        await createSpendingCategory({ name: newCategoryName });
        toast.success("Category added");
        handleAddCategoryClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setRows([]);
    setRowErrors([]);
    setQuickLine("");
  }

  function addRow() {
    setRows((prev) => [...prev, { value: "", category: "", currency: homeCurrency }]);
    setRowErrors((prev) => [...prev, undefined]);
  }

  const quickEntry = parseQuickEntry(quickLine, allCategories);

  // Enter on the quick-entry line adds its row at the bottom and clears the line, which keeps
  // focus. A line that can't be read adds nothing and keeps its text, with the reason shown.
  // Enter never reaches the modal, which would otherwise Save: saving stays on its button.
  function handleQuickLineKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (!quickEntry?.ok) return;
    setRows((prev) => [...prev, { ...quickEntry.row, currency: homeCurrency }]);
    setRowErrors((prev) => [...prev, undefined]);
    setQuickLine("");
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setRowErrors((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, field: keyof SpendingLogRow, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
    setRowErrors((prev) => prev.map((e, i) => (i === idx ? undefined : e)));
  }

  function handleSave() {
    const nonBlank = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.value.trim() || row.category);

    if (nonBlank.length === 0) {
      handleClose();
      return;
    }

    const newErrors: (string | undefined)[] = rows.map(() => undefined);
    let hasErrors = false;
    for (const { row, idx } of nonBlank) {
      if (!row.category) {
        newErrors[idx] = "Select a category";
        hasErrors = true;
      } else if (!Number(row.value) || Number(row.value) <= 0) {
        newErrors[idx] = "Enter a positive number";
        hasErrors = true;
      }
    }
    if (hasErrors) {
      setRowErrors(newErrors);
      return;
    }

    const validRows = nonBlank.map(({ row }) => row);
    startTransition(async () => {
      try {
        // One request for every row: all saved or none, so a retry after an error is safe.
        await createSpendingEntries(viewedMonth, validRows);
        toast.success("Entries saved");
        handleClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <div
        className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
        style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <button
          type="button"
          onClick={() => setAddCategoryOpen(true)}
          aria-label="Add spending category"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--text-secondary) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <PlusCircleIcon size={22} />
        </button>
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Log spending"
          className="vivid flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-(--text-on-strong-hue)"
        >
          <ReceiptIcon size={22} />
        </button>
      </div>

      <ActionModal
        isOpen={addCategoryOpen}
        onClose={handleAddCategoryClose}
        size="small"
        title="Add category"
        content={
          <TextInput value={newCategoryName} onChange={setNewCategoryName} placeholder="Name" />
        }
        primaryButton={{
          label: "Add",
          loading: isAddCategoryPending,
          onClick: handleAddCategorySubmit,
        }}
        secondaryButton={{ label: "Cancel", onClick: handleAddCategoryClose }}
        closeOnBackdropClick={!isAddCategoryPending}
        closeOnEscapeKeyDown={!isAddCategoryPending}
      />

      <ActionModal
        isOpen={open}
        onClose={handleClose}
        size="large"
        title="Log spending"
        content={
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--text-secondary)">For: {formatMonth(viewedMonth)}</p>
            <div className="flex flex-col gap-1">
              <TextInput
                value={quickLine}
                onChange={setQuickLine}
                onKeyDown={handleQuickLineKeyDown}
                placeholder="45 gr: an amount, then the start of a category"
                autoFocus
              />
              <p
                aria-live="polite"
                className={`min-h-4 pl-1 text-xs ${quickEntry && !quickEntry.ok ? "text-red-500" : "text-(--text-secondary)"}`}
              >
                {quickEntry === null
                  ? ""
                  : quickEntry.ok
                    ? `${quickEntry.row.value} → ${quickEntry.row.category}`
                    : quickEntry.error}
              </p>
            </div>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {rows.map((row, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are transient form entries with no stable ID
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-28 shrink-0">
                      <TextInput
                        value={row.value}
                        onChange={(v) => updateRow(idx, "value", v)}
                        placeholder="Amount"
                      />
                    </div>
                    <div className="flex-1">
                      <Select
                        value={row.category}
                        onValueChange={(v) => updateRow(idx, "category", v)}
                        placeholder="Category"
                      >
                        {allCategories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24 shrink-0">
                      <Select
                        value={row.currency}
                        onValueChange={(v) => updateRow(idx, "currency", v)}
                        placeholder="Currency"
                      >
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label="Remove row"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--text-secondary) hover:bg-(--surface-200) hover:text-(--text)"
                    >
                      <MinusIcon size={16} />
                    </button>
                  </div>
                  {rowErrors[idx] && <p className="pl-1 text-xs text-red-500">{rowErrors[idx]}</p>}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 self-start text-sm text-(--text-secondary) hover:text-(--text)"
            >
              <PlusIcon size={14} />
              Add row
            </button>
          </div>
        }
        primaryButton={{ label: "Save", loading: isPending, onClick: handleSave }}
        secondaryButton={{ label: "Cancel", onClick: handleClose }}
        closeOnBackdropClick={false}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

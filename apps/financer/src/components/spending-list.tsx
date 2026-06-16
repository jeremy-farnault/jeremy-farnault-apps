"use client";

import { deleteSpendingEntry, updateSpendingEntry } from "@/lib/actions";
import { CURRENCIES, SPENDING_CATEGORIES } from "@/lib/constants";
import type { SpendingCategoryRow, SpendingEntryRow, SpendingRow } from "@/lib/queries";
import { ActionModal, Select, SelectItem, TextInput } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface SpendingListProps {
  data: SpendingRow[];
  homeCurrency: string;
  rates: Record<string, number>;
  isOpen: boolean;
  entries: SpendingEntryRow[];
  categoryColors: Record<string, string>;
  customCategories: SpendingCategoryRow[];
}

export function SpendingList({
  data,
  homeCurrency,
  rates,
  isOpen,
  entries,
  categoryColors,
  customCategories,
}: SpendingListProps) {
  const allCategories = [...SPENDING_CATEGORIES, ...customCategories.map((c) => c.name)].sort(
    (a, b) => a.localeCompare(b)
  );
  const [editingEntry, setEditingEntry] = useState<SpendingEntryRow | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editCurrency, setEditCurrency] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editValueError, setEditValueError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function openEdit(entry: SpendingEntryRow) {
    setEditingEntry(entry);
    setEditCategory(entry.category);
    setEditCurrency(entry.currency);
    setEditValue(String(entry.value));
  }

  function handleEditClose() {
    setEditingEntry(null);
    setEditCategory("");
    setEditCurrency("");
    setEditValue("");
    setEditValueError(undefined);
  }

  function handleEditSubmit() {
    if (!editingEntry) return;
    if (!Number(editValue) || Number(editValue) <= 0) {
      setEditValueError("Enter a positive number");
      return;
    }
    startTransition(async () => {
      try {
        await updateSpendingEntry(editingEntry.id, {
          category: editCategory,
          currency: editCurrency,
          value: editValue,
        });
        toast.success("Entry updated");
        handleEditClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deletingEntryId) return;
    startTransition(async () => {
      try {
        await deleteSpendingEntry(deletingEntryId);
        toast.success("Entry deleted");
        setDeletingEntryId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const showFooter = Object.keys(rates).length > 0;

  // Open month: individual entries with edit/delete
  if (isOpen) {
    let grandTotal = 0;
    let hasMissingRate = false;
    for (const entry of entries) {
      const isHome = entry.currency === homeCurrency;
      const rateFrom = rates[entry.currency];
      const rateTo = rates[homeCurrency];
      if (isHome) {
        grandTotal += entry.value;
      } else if (rateFrom !== undefined && rateTo !== undefined) {
        grandTotal += entry.value * (rateTo / rateFrom);
      } else {
        hasMissingRate = true;
      }
    }

    return (
      <>
        <div className="flex flex-col gap-4">
          {entries.length === 0 ? (
            <p className="text-sm text-(--grey-500)">No spending logged for this month.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  style={{ borderLeft: `4px solid ${categoryColors[entry.category]}` }}
                  className="flex items-center justify-between rounded-[12px] bg-(--surface-100) px-4 py-3"
                >
                  <span className="text-sm font-medium text-(--grey-900)">{entry.category}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-(--grey-500)">{entry.currency}</span>
                    <span className="text-sm font-semibold text-(--grey-900)">
                      {formatAmount(entry.value)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        aria-label="Edit entry"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                      >
                        <PencilSimpleIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntryId(entry.id)}
                        aria-label="Delete entry"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showFooter && entries.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-(--border) pt-3">
              <div className="flex justify-between text-sm font-semibold text-(--grey-900)">
                <span>Total</span>
                <span>
                  ≈ {homeCurrency} {formatAmount(grandTotal)}
                </span>
              </div>
              {hasMissingRate && (
                <p className="text-xs text-(--grey-500)">
                  Some amounts excluded — exchange rate unavailable
                </p>
              )}
            </div>
          )}
        </div>

        <ActionModal
          isOpen={!!editingEntry}
          onClose={handleEditClose}
          size="small"
          title="Edit entry"
          content={
            <div className="flex flex-col gap-3">
              <Select value={editCategory} onValueChange={setEditCategory} placeholder="Category">
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </Select>
              <Select value={editCurrency} onValueChange={setEditCurrency} placeholder="Currency">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </Select>
              <TextInput
                value={editValue}
                onChange={(v) => {
                  setEditValue(v);
                  setEditValueError(undefined);
                }}
                placeholder="Amount"
              />
              {editValueError && <p className="text-xs text-red-500">{editValueError}</p>}
            </div>
          }
          primaryButton={{ label: "Save", loading: isPending, onClick: handleEditSubmit }}
          secondaryButton={{ label: "Cancel", onClick: handleEditClose }}
          closeOnBackdropClick={!isPending}
          closeOnEscapeKeyDown={!isPending}
        />

        <ActionModal
          isOpen={!!deletingEntryId}
          onClose={() => setDeletingEntryId(null)}
          size="small"
          title="Delete entry?"
          content={
            <p className="text-sm text-(--grey-700)">Are you sure you want to delete this entry?</p>
          }
          primaryButton={{ label: "Delete", loading: isPending, onClick: handleDeleteConfirm }}
          secondaryButton={{ label: "Cancel", onClick: () => setDeletingEntryId(null) }}
          closeOnBackdropClick={!isPending}
          closeOnEscapeKeyDown={!isPending}
        />
      </>
    );
  }

  // Closed month: aggregated display
  if (data.length === 0) {
    return <p className="text-sm text-(--grey-500)">No spending logged for this month.</p>;
  }

  let grandTotal = 0;
  let hasMissingRate = false;

  const rows = data.map(({ category, currency, total }) => {
    const isHome = currency === homeCurrency;
    const rateFrom = rates[currency];
    const rateTo = rates[homeCurrency];
    const canConvert = !isHome && rateFrom !== undefined && rateTo !== undefined;

    let displayAmount: string;
    let prefix = "";

    if (isHome) {
      grandTotal += total;
      displayAmount = formatAmount(total);
    } else if (canConvert) {
      const converted = total * (rateTo! / rateFrom!);
      grandTotal += converted;
      displayAmount = formatAmount(converted);
      prefix = "≈ ";
    } else {
      hasMissingRate = true;
      displayAmount = formatAmount(total);
    }

    return { category, currency, displayAmount, prefix };
  });

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {rows.map(({ category, currency, displayAmount, prefix }) => (
          <li
            key={`${category}-${currency}`}
            style={{ borderLeft: `4px solid ${categoryColors[category]}` }}
            className="flex items-center justify-between rounded-[12px] bg-(--surface-100) px-4 py-3"
          >
            <span className="text-sm font-medium text-(--grey-900)">{category}</span>
            <span className="ml-auto flex items-center gap-3">
              <span className="text-xs text-(--grey-500)">{currency}</span>
              <span className="text-sm font-semibold text-(--grey-900)">
                {prefix}
                {displayAmount}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {showFooter && (
        <div className="flex flex-col gap-1 border-t border-(--border) pt-3">
          <div className="flex justify-between text-sm font-semibold text-(--grey-900)">
            <span>Total</span>
            <span>
              ≈ {homeCurrency} {formatAmount(grandTotal)}
            </span>
          </div>
          {hasMissingRate && (
            <p className="text-xs text-(--grey-500)">
              Some amounts excluded — exchange rate unavailable
            </p>
          )}
        </div>
      )}
    </div>
  );
}

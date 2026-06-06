"use client";

import {
  addIncomeEntry,
  deleteIncomeEntry,
  deleteIncomeSource,
  updateIncomeEntry,
  updateIncomeSource,
  updateIncomeSourceColor,
} from "@/lib/actions";
import { FINANCER_COLOR_PALETTE, INCOME_SOURCE_COLORS } from "@/lib/constants";
import type { IncomeEntryRow, IncomeSourceRow } from "@/lib/queries";
import { ActionModal, ColorPicker, TextInput } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

interface IncomeSourcesListProps {
  sources: IncomeSourceRow[];
  month: string;
  entries: IncomeEntryRow[];
  isOpen: boolean;
}

export function IncomeSourcesList({ sources, month, entries, isOpen }: IncomeSourcesListProps) {
  const [editingSource, setEditingSource] = useState<IncomeSourceRow | null>(null);
  const [deletingSource, setDeletingSource] = useState<IncomeSourceRow | null>(null);
  const [loggingSource, setLoggingSource] = useState<IncomeSourceRow | null>(null);
  const [coloringSourceId, setColoringSourceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [logValue, setLogValue] = useState("");
  const [logValueError, setLogValueError] = useState<string | undefined>();
  const [editingEntry, setEditingEntry] = useState<IncomeEntryRow | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editEntryValue, setEditEntryValue] = useState("");
  const [editEntryValueError, setEditEntryValueError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const entriesBySource = new Map<string, IncomeEntryRow[]>();
  for (const entry of entries) {
    const list = entriesBySource.get(entry.sourceId) ?? [];
    list.push(entry);
    entriesBySource.set(entry.sourceId, list);
  }

  function openEdit(source: IncomeSourceRow) {
    setEditingSource(source);
    setName(source.name);
    setCurrency(source.currency);
  }

  function handleEditClose() {
    setEditingSource(null);
    setName("");
    setCurrency("");
  }

  function handleEditSubmit() {
    if (!editingSource || !name.trim() || !currency.trim()) return;
    startTransition(async () => {
      try {
        await updateIncomeSource(editingSource.id, { name, currency });
        toast.success("Source updated");
        handleEditClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deletingSource) return;
    startTransition(async () => {
      try {
        await deleteIncomeSource(deletingSource.id);
        toast.success("Source deleted");
        setDeletingSource(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function openLog(source: IncomeSourceRow) {
    setLoggingSource(source);
    setLogValue("");
  }

  function handleLogClose() {
    setLoggingSource(null);
    setLogValue("");
    setLogValueError(undefined);
  }

  function handleLogSubmit() {
    if (!loggingSource) return;
    if (!logValue.trim() || Number.isNaN(Number(logValue))) {
      setLogValueError("Enter a valid number");
      return;
    }
    startTransition(async () => {
      try {
        await addIncomeEntry(loggingSource.id, month, logValue);
        toast.success("Amount logged");
        handleLogClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function openEditEntry(entry: IncomeEntryRow) {
    setEditingEntry(entry);
    setEditEntryValue(String(entry.value));
  }

  function handleEditEntryClose() {
    setEditingEntry(null);
    setEditEntryValue("");
    setEditEntryValueError(undefined);
  }

  function handleEditEntrySubmit() {
    if (!editingEntry) return;
    if (!editEntryValue.trim() || Number.isNaN(Number(editEntryValue))) {
      setEditEntryValueError("Enter a valid number");
      return;
    }
    startTransition(async () => {
      try {
        await updateIncomeEntry(editingEntry.id, editEntryValue);
        toast.success("Entry updated");
        handleEditEntryClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleDeleteEntryConfirm() {
    if (!deletingEntryId) return;
    startTransition(async () => {
      try {
        await deleteIncomeEntry(deletingEntryId);
        toast.success("Entry deleted");
        setDeletingEntryId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleColorChange(sourceId: string, color: string) {
    setColoringSourceId(null);
    startTransition(async () => {
      try {
        await updateIncomeSourceColor(sourceId, color);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (sources.length === 0) {
    return <p className="text-sm text-(--grey-500)">No income sources yet.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.map((source, index) => {
          const effectiveColor =
            source.color ??
            INCOME_SOURCE_COLORS[index % INCOME_SOURCE_COLORS.length] ??
            "var(--grey-400)";
          return (
            <li
              key={source.id}
              style={{ borderLeft: `4px solid ${effectiveColor}` }}
              className="flex flex-col gap-2 rounded-[12px] bg-(--surface-100) p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setColoringSourceId(coloringSourceId === source.id ? null : source.id)
                  }
                  title="Change color"
                  style={{
                    width: 12,
                    height: 12,
                    flexShrink: 0,
                    borderRadius: "50%",
                    backgroundColor: effectiveColor,
                    border: "1px solid rgba(0,0,0,0.15)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <span className="truncate text-sm font-medium text-(--grey-900)">
                  {source.name}
                </span>
                <span className="shrink-0 text-xs text-(--grey-500)">{source.currency}</span>
              </div>
              {coloringSourceId === source.id && (
                <div className="pt-1 pb-0.5">
                  <ColorPicker
                    palette={FINANCER_COLOR_PALETTE}
                    value={effectiveColor}
                    onChange={(color) => handleColorChange(source.id, color)}
                  />
                </div>
              )}
              {(entriesBySource.get(source.id) ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-[8px] bg-(--surface-150) px-2 py-1"
                >
                  <span className="text-sm text-(--grey-700)">
                    {entry.value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {isOpen && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openEditEntry(entry)}
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
                  )}
                </div>
              ))}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => openEdit(source)}
                  aria-label="Edit source"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                >
                  <PencilSimpleIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSource(source)}
                  aria-label="Delete source"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
                >
                  <TrashIcon size={16} />
                </button>
                {isOpen && (
                  <button
                    type="button"
                    onClick={() => openLog(source)}
                    className="ml-auto h-7 px-3 rounded-[8px] text-xs font-medium text-(--grey-700) bg-(--surface-150) hover:bg-(--surface-200) transition-colors"
                  >
                    + Log
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ActionModal
        isOpen={!!editingSource}
        onClose={handleEditClose}
        size="small"
        title="Edit source"
        content={
          <div className="flex flex-col gap-3">
            <TextInput value={name} onChange={setName} placeholder="Name" />
            <TextInput value={currency} onChange={setCurrency} placeholder="Currency (e.g. EUR)" />
          </div>
        }
        primaryButton={{ label: "Save", loading: isPending, onClick: handleEditSubmit }}
        secondaryButton={{ label: "Cancel", onClick: handleEditClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />

      <ActionModal
        isOpen={!!deletingSource}
        onClose={() => setDeletingSource(null)}
        size="small"
        title="Delete source?"
        content={
          <div className="flex flex-col gap-2">
            <p className="text-sm text-(--grey-700)">
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingSource?.name}</span>?
            </p>
            {deletingSource?.hasEntries && (
              <p className="text-sm text-red-500">
                This will also delete all logged amounts for this source.
              </p>
            )}
          </div>
        }
        primaryButton={{ label: "Delete", loading: isPending, onClick: handleDeleteConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeletingSource(null) }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />

      <ActionModal
        isOpen={!!editingEntry}
        onClose={handleEditEntryClose}
        size="small"
        title="Edit entry"
        content={
          <div className="flex flex-col gap-3">
            <TextInput
              value={editEntryValue}
              onChange={(v) => {
                setEditEntryValue(v);
                setEditEntryValueError(undefined);
              }}
              placeholder="Amount"
            />
            {editEntryValueError && <p className="text-xs text-red-500">{editEntryValueError}</p>}
          </div>
        }
        primaryButton={{ label: "Save", loading: isPending, onClick: handleEditEntrySubmit }}
        secondaryButton={{ label: "Cancel", onClick: handleEditEntryClose }}
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
        primaryButton={{ label: "Delete", loading: isPending, onClick: handleDeleteEntryConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeletingEntryId(null) }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />

      <ActionModal
        isOpen={!!loggingSource}
        onClose={handleLogClose}
        size="small"
        title="Log amount"
        content={
          <div className="flex flex-col gap-3">
            <p className="text-sm text-(--grey-500)">
              {loggingSource?.name} · {loggingSource?.currency} · {formatMonth(month)}
            </p>
            <TextInput
              value={logValue}
              onChange={(v) => {
                setLogValue(v);
                setLogValueError(undefined);
              }}
              placeholder="Amount"
            />
            {logValueError && <p className="text-xs text-red-500">{logValueError}</p>}
          </div>
        }
        primaryButton={{ label: "Save", loading: isPending, onClick: handleLogSubmit }}
        secondaryButton={{ label: "Cancel", onClick: handleLogClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

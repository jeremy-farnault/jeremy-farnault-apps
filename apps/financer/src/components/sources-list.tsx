"use client";

import { deleteIncomeSource, updateIncomeSource, upsertIncomeEntry } from "@/lib/actions";
import type { IncomeSourceRow, SavingsRow } from "@/lib/queries";
import { ActionModal, TextInput } from "@jf/ui";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

interface SourcesListProps {
  sources: IncomeSourceRow[];
  month: string;
  savingsData: SavingsRow[];
}

export function SourcesList({ sources, month, savingsData }: SourcesListProps) {
  const [editingSource, setEditingSource] = useState<IncomeSourceRow | null>(null);
  const [deletingSource, setDeletingSource] = useState<IncomeSourceRow | null>(null);
  const [loggingSource, setLoggingSource] = useState<IncomeSourceRow | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [logValue, setLogValue] = useState("");
  const [logValueError, setLogValueError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const existingTotals = new Map(savingsData.map((r) => [r.sourceId, r.total]));

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
    const existing = existingTotals.get(source.id);
    setLoggingSource(source);
    setLogValue(existing ? String(existing) : "");
  }

  function handleLogClose() {
    setLoggingSource(null);
    setLogValue("");
    setLogValueError(undefined);
  }

  function handleLogSubmit() {
    if (!loggingSource) return;
    if (!Number(logValue) || Number(logValue) <= 0) {
      setLogValueError("Enter a positive number");
      return;
    }
    startTransition(async () => {
      try {
        await upsertIncomeEntry(loggingSource.id, month, logValue);
        toast.success("Amount logged");
        handleLogClose();
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
      <ul className="flex flex-col gap-2">
        {sources.map((source) => (
          <li
            key={source.id}
            className="group flex items-center justify-between rounded-[12px] bg-(--surface-100) px-4 py-3"
          >
            <span className="text-sm font-medium text-(--grey-900)">
              {source.name}
              <span className="ml-2 text-xs text-(--grey-500)">{source.currency}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openLog(source)}
                className="h-7 px-3 rounded-[8px] text-xs font-medium text-(--grey-700) bg-(--surface-150) hover:bg-(--surface-200) transition-colors"
              >
                {existingTotals.has(source.id) ? "Edit" : "+ Log"}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
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
              </div>
            </div>
          </li>
        ))}
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

"use client";

import { addAssetEntry, createAssetSource } from "@/lib/actions";
import { CURRENCIES } from "@/lib/constants";
import type { AssetSourceRow } from "@/lib/queries";
import { ActionModal, Select, SelectItem, TextInput } from "@jf/ui";
import { MinusIcon, PlusCircleIcon, PlusIcon, PlusSquareIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AssetsCtaProps {
  viewedMonth: string;
  homeCurrency: string;
  sources: AssetSourceRow[];
}

type AssetLogRow = { sourceId: string; currency: string; value: string };

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function AssetsCta({ viewedMonth, homeCurrency, sources }: AssetsCtaProps) {
  // Add source modal state
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState("");
  const [isAddSourcePending, startAddSourceTransition] = useTransition();

  // Bulk log modal state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rows, setRows] = useState<AssetLogRow[]>([
    { sourceId: "", currency: homeCurrency, value: "" },
  ]);
  const [rowErrors, setRowErrors] = useState<(string | undefined)[]>([undefined]);
  const [isBulkPending, startBulkTransition] = useTransition();

  // Add source handlers
  function handleAddSourceClose() {
    setAddSourceOpen(false);
    setName("");
    setSourceCurrency("");
  }

  function handleAddSourceSubmit() {
    if (!name.trim() || !sourceCurrency.trim()) return;
    startAddSourceTransition(async () => {
      try {
        await createAssetSource({ name, currency: sourceCurrency });
        toast.success("Source added");
        handleAddSourceClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Bulk log handlers
  function handleBulkOpen() {
    setBulkOpen(true);
  }

  function handleBulkClose() {
    setBulkOpen(false);
    setRows([{ sourceId: "", currency: homeCurrency, value: "" }]);
    setRowErrors([undefined]);
  }

  function addRow() {
    setRows((prev) => [...prev, { sourceId: "", currency: homeCurrency, value: "" }]);
    setRowErrors((prev) => [...prev, undefined]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setRowErrors((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSource(idx: number, sourceId: string) {
    const source = sources.find((s) => s.id === sourceId);
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, sourceId, currency: source?.currency ?? r.currency } : r
      )
    );
    setRowErrors((prev) => prev.map((e, i) => (i === idx ? undefined : e)));
  }

  function updateRow(idx: number, field: keyof AssetLogRow, val: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
    setRowErrors((prev) => prev.map((e, i) => (i === idx ? undefined : e)));
  }

  function handleBulkSave() {
    const nonBlank = rows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => row.sourceId || row.value.trim());

    if (nonBlank.length === 0) {
      handleBulkClose();
      return;
    }

    const newErrors: (string | undefined)[] = rows.map(() => undefined);
    let hasErrors = false;
    for (const { row, idx } of nonBlank) {
      if (!row.sourceId) {
        newErrors[idx] = "Select a source";
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
    startBulkTransition(async () => {
      try {
        await Promise.all(validRows.map((r) => addAssetEntry(r.sourceId, viewedMonth, r.value)));
        toast.success("Entries saved");
        handleBulkClose();
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
          onClick={() => setAddSourceOpen(true)}
          aria-label="Add asset source"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <PlusCircleIcon size={22} />
        </button>
        <button
          type="button"
          onClick={handleBulkOpen}
          aria-label="Log assets"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
        >
          <PlusSquareIcon size={22} />
        </button>
      </div>

      <ActionModal
        isOpen={addSourceOpen}
        onClose={handleAddSourceClose}
        size="small"
        title="Add source"
        content={
          <div className="flex flex-col gap-3">
            <TextInput value={name} onChange={setName} placeholder="Name" />
            <Select value={sourceCurrency} onValueChange={setSourceCurrency} placeholder="Currency">
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </Select>
          </div>
        }
        primaryButton={{
          label: "Add",
          loading: isAddSourcePending,
          onClick: handleAddSourceSubmit,
        }}
        secondaryButton={{ label: "Cancel", onClick: handleAddSourceClose }}
        closeOnBackdropClick={!isAddSourcePending}
        closeOnEscapeKeyDown={!isAddSourcePending}
      />

      <ActionModal
        isOpen={bulkOpen}
        onClose={handleBulkClose}
        size="large"
        title="Log assets"
        content={
          <div className="flex flex-col gap-4">
            <p className="text-sm text-(--grey-600)">For: {formatMonth(viewedMonth)}</p>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {rows.map((row, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are transient form entries with no stable ID
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        value={row.sourceId}
                        onValueChange={(v) => updateSource(idx, v)}
                        placeholder="Source"
                      >
                        {sources.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
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
                    <div className="w-24 shrink-0">
                      <TextInput
                        value={row.value}
                        onChange={(v) => updateRow(idx, "value", v)}
                        placeholder="Amount"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      aria-label="Remove row"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900) ${idx === 0 ? "invisible" : ""}`}
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
              className="flex items-center gap-1 self-start text-sm text-(--grey-600) hover:text-(--grey-900)"
            >
              <PlusIcon size={14} />
              Add row
            </button>
          </div>
        }
        primaryButton={{ label: "Save", loading: isBulkPending, onClick: handleBulkSave }}
        secondaryButton={{ label: "Cancel", onClick: handleBulkClose }}
        closeOnBackdropClick={!isBulkPending}
        closeOnEscapeKeyDown={!isBulkPending}
      />
    </>
  );
}

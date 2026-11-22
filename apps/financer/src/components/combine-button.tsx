"use client";

import { combineAssetMonth, combineIncomeMonth, combineSpendingMonth } from "@/lib/actions";
import { ActionModal } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export type CombineKind = "spending" | "income" | "assets";

/** One group that will merge, as shown in the confirmation. */
export interface CombinePreview {
  key: string;
  label: string;
  currency: string;
  count: number;
  total: number;
}

const COMBINE: Record<CombineKind, (month: string) => Promise<void>> = {
  spending: combineSpendingMonth,
  income: combineIncomeMonth,
  assets: combineAssetMonth,
};

const GROUPED_BY: Record<CombineKind, string> = {
  spending: "category and currency",
  income: "source",
  assets: "source",
};

interface CombineButtonProps {
  kind: CombineKind;
  month: string;
  groups: CombinePreview[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Shown only when at least one group has two or more entries. */
export function CombineButton({ kind, month, groups }: CombineButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (groups.length === 0) return null;

  function handleConfirm() {
    startTransition(async () => {
      try {
        await COMBINE[kind](month);
        toast.success("Entries combined");
        setModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const content = (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-(--text-muted) mb-1">
        Entries with the same {GROUPED_BY[kind]} become one entry with their total. Totals don't
        change, and the month stays editable, but the separate entries can't be brought back.
      </p>
      {groups.map((group) => (
        <div key={group.key} className="flex justify-between gap-3 text-sm">
          <span className="text-(--text-secondary)">
            {group.label} · {group.count} entries
          </span>
          <span className="text-(--text) font-medium">
            {group.currency} {formatCurrency(group.total)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="self-start h-9 px-4 rounded-[10px] text-sm font-medium text-(--text-secondary) bg-(--surface-150) hover:bg-(--surface-200) transition-colors"
      >
        Combine
      </button>

      <ActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="small"
        title="Combine entries?"
        content={content}
        primaryButton={{ label: "Combine", loading: isPending, onClick: handleConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setModalOpen(false) }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

"use client";

import { closeMonth } from "@/lib/actions";
import type { SpendingRow } from "@/lib/queries";
import { ActionModal } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface CloseMonthButtonProps {
  month: string;
  spendingData: SpendingRow[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CloseMonthButton({ month, spendingData }: CloseMonthButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await closeMonth(month);
        toast.success("Month closed");
        setModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const content = (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-(--grey-500) mb-1">
        This will compress all entries into category totals. This action cannot be undone.
      </p>
      {spendingData.map((row) => (
        <div key={row.category} className="flex justify-between text-sm">
          <span className="text-(--grey-700)">{row.category}</span>
          <span className="text-(--grey-900) font-medium">{formatCurrency(row.total)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="self-start h-9 px-4 rounded-[10px] text-sm font-medium text-(--grey-700) bg-(--surface-150) hover:bg-(--surface-200) transition-colors"
      >
        Close month
      </button>

      <ActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="small"
        title="Close month?"
        content={content}
        primaryButton={{
          label: "Close month",
          loading: isPending,
          onClick: handleConfirm,
        }}
        secondaryButton={{ label: "Cancel", onClick: () => setModalOpen(false) }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

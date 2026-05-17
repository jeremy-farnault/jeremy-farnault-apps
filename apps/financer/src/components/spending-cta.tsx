"use client";

import { createSpendingEntry } from "@/lib/actions";
import { SPENDING_CATEGORIES } from "@/lib/constants";
import { ActionModal, Select, SelectItem, TextInput } from "@jf/ui";
import { FolderPlusIcon, PlusSquareIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface SpendingCtaProps {
  viewedMonth: string;
  availableMonths: string[];
}

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function SpendingCta({ viewedMonth, availableMonths }: SpendingCtaProps) {
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [fullCreateOpen, setFullCreateOpen] = useState(false);
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState(viewedMonth);
  const [valueError, setValueError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setQuickLogOpen(false);
    setFullCreateOpen(false);
    setValue("");
    setCategory("");
    setMonth(viewedMonth);
    setValueError(undefined);
  }

  function handleSubmit(submittedMonth: string) {
    if (!Number(value) || Number(value) <= 0) {
      setValueError("Enter a positive number");
      return;
    }
    if (!category) {
      return;
    }
    startTransition(async () => {
      try {
        await createSpendingEntry({ category, value, month: submittedMonth });
        toast.success("Entry saved");
        handleClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  const formContent = (
    <div className="flex flex-col gap-3">
      <TextInput
        value={value}
        onChange={(v) => {
          setValue(v);
          setValueError(undefined);
        }}
        placeholder="Amount"
      />
      {valueError && <p className="text-xs text-red-500">{valueError}</p>}
      <Select value={category} onValueChange={setCategory} placeholder="Category">
        {SPENDING_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </Select>
    </div>
  );

  const fullCreateContent = (
    <div className="flex flex-col gap-3">
      <TextInput
        value={value}
        onChange={(v) => {
          setValue(v);
          setValueError(undefined);
        }}
        placeholder="Amount"
      />
      {valueError && <p className="text-xs text-red-500">{valueError}</p>}
      <Select value={category} onValueChange={setCategory} placeholder="Category">
        {SPENDING_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </Select>
      <Select value={month} onValueChange={setMonth} placeholder="Month">
        {availableMonths.map((m) => (
          <SelectItem key={m} value={m}>
            {formatMonth(m)}
          </SelectItem>
        ))}
      </Select>
    </div>
  );

  return (
    <>
      <div
        className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
        style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <button
          type="button"
          onClick={() => setFullCreateOpen(true)}
          aria-label="Log spending for another month"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <FolderPlusIcon size={22} />
        </button>
        <button
          type="button"
          onClick={() => setQuickLogOpen(true)}
          aria-label="Quick log spending"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
        >
          <PlusSquareIcon size={22} />
        </button>
      </div>

      <ActionModal
        isOpen={quickLogOpen}
        onClose={handleClose}
        size="small"
        title="Log spending"
        content={formContent}
        primaryButton={{
          label: "Save",
          loading: isPending,
          onClick: () => handleSubmit(getCurrentMonth()),
        }}
        secondaryButton={{ label: "Cancel", onClick: handleClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />

      <ActionModal
        isOpen={fullCreateOpen}
        onClose={handleClose}
        size="small"
        title="Log spending"
        content={fullCreateContent}
        primaryButton={{
          label: "Save",
          loading: isPending,
          onClick: () => handleSubmit(month),
        }}
        secondaryButton={{ label: "Cancel", onClick: handleClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

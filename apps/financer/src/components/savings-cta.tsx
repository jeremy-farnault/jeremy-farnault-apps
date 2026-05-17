"use client";

import { createIncomeSource } from "@/lib/actions";
import { ActionModal, TextInput } from "@jf/ui";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function SavingsCta() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setOpen(false);
    setName("");
    setCurrency("");
  }

  function handleSubmit() {
    if (!name.trim() || !currency.trim()) return;
    startTransition(async () => {
      try {
        await createIncomeSource({ name, currency });
        toast.success("Source added");
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
          onClick={() => setOpen(true)}
          aria-label="Add income source"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
        >
          <PlusSquareIcon size={22} />
        </button>
      </div>

      <ActionModal
        isOpen={open}
        onClose={handleClose}
        size="small"
        title="Add source"
        content={
          <div className="flex flex-col gap-3">
            <TextInput value={name} onChange={setName} placeholder="Name" />
            <TextInput value={currency} onChange={setCurrency} placeholder="Currency (e.g. EUR)" />
          </div>
        }
        primaryButton={{ label: "Add", loading: isPending, onClick: handleSubmit }}
        secondaryButton={{ label: "Cancel", onClick: handleClose }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}

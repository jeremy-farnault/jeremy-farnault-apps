"use client";

import { createMedicineAction, updateMedicineAction } from "@/lib/actions";
import type { Medicine } from "@/lib/queries";
import { ActionModal, DatePicker, TextInput } from "@jf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ColorPicker, DEFAULT_MEDICINE_COLOR } from "./color-picker";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  medicine?: Medicine;
  onCreated?: (medicine: Medicine) => void;
};

type FormErrors = {
  name?: string;
  daysOn?: string;
  daysOff?: string;
};

const numberInputClass =
  "h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none placeholder:text-(--grey-400)";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MedicineFormModal({ isOpen, onClose, medicine, onCreated }: Props) {
  const isEditMode = !!medicine;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [daysOn, setDaysOn] = useState("");
  const [daysOff, setDaysOff] = useState("");
  const [cycleStartDate, setCycleStartDate] = useState(todayIso());
  const [color, setColor] = useState(DEFAULT_MEDICINE_COLOR);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (medicine) {
      setName(medicine.name);
      setDaysOn(String(medicine.daysOn));
      setDaysOff(String(medicine.daysOff));
      setCycleStartDate(medicine.cycleStartDate);
      setColor(medicine.color);
    } else {
      setName("");
      setDaysOn("");
      setDaysOff("");
      setCycleStartDate(todayIso());
      setColor(DEFAULT_MEDICINE_COLOR);
    }
    setErrors({});
  }, [isOpen, medicine]);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    const daysOnNum = Number(daysOn);
    if (!daysOn.trim() || !Number.isInteger(daysOnNum) || daysOnNum <= 0) {
      next.daysOn = "Must be a positive integer";
    }
    const daysOffNum = Number(daysOff);
    if (!daysOff.trim() || !Number.isInteger(daysOffNum) || daysOffNum < 0) {
      next.daysOff = "Must be zero or a positive integer";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof FormErrors) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const input = {
          name: name.trim(),
          daysOn: Number(daysOn),
          daysOff: Number(daysOff),
          cycleStartDate,
          color,
        };
        if (isEditMode && medicine) {
          await updateMedicineAction({ id: medicine.id, ...input });
        } else {
          const newMedicine = await createMedicineAction(input);
          onCreated?.(newMedicine);
        }
        toast.success(isEditMode ? "Medicine updated" : "Medicine created");
        router.refresh();
        onClose();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <TextInput
          placeholder="Name"
          value={name}
          onChange={(v) => {
            setName(v);
            if (errors.name) clearError("name");
          }}
        />
        {errors.name && <p className="text-xs text-(--red-500)">{errors.name}</p>}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <input
            type="number"
            value={daysOn}
            onChange={(e) => {
              setDaysOn(e.target.value);
              if (errors.daysOn) clearError("daysOn");
            }}
            placeholder="Days on"
            className={numberInputClass}
          />
          {errors.daysOn && <p className="text-xs text-(--red-500)">{errors.daysOn}</p>}
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <input
            type="number"
            value={daysOff}
            onChange={(e) => {
              setDaysOff(e.target.value);
              if (errors.daysOff) clearError("daysOff");
            }}
            placeholder="Days off"
            className={numberInputClass}
          />
          {errors.daysOff && <p className="text-xs text-(--red-500)">{errors.daysOff}</p>}
        </div>
      </div>

      <DatePicker value={cycleStartDate} onChange={setCycleStartDate} />

      <ColorPicker value={color} onChange={setColor} />
    </div>
  );

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={isEditMode ? "Edit medicine" : "New medicine"}
      content={content}
      primaryButton={{
        label: isEditMode ? "Save" : "Create",
        loading: isPending,
        onClick: handleSubmit,
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}

"use client";

import { createMedicineAction, updateMedicineAction } from "@/lib/actions";
import type { Medicine, PillType } from "@/lib/queries";
import { ActionModal, DatePicker, TextInput } from "@jf/ui";
import { XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ColorPicker, DEFAULT_PILL_TYPE_COLOR } from "./color-picker";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  medicine?: Medicine;
  initialTypes?: PillType[];
  onCreated?: (medicine: Medicine) => void;
};

type TypeRow = {
  key: string;
  name: string;
  color: string;
  days: string;
};

type FormErrors = {
  name?: string;
  daysOff?: string;
  typeDays?: Record<string, string>;
};

const numberInputClass =
  "h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none placeholder:text-(--grey-400)";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyType(): TypeRow {
  return { key: crypto.randomUUID(), name: "", color: DEFAULT_PILL_TYPE_COLOR, days: "" };
}

export function MedicineFormModal({ isOpen, onClose, medicine, initialTypes, onCreated }: Props) {
  const isEditMode = !!medicine;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [cycleStartDate, setCycleStartDate] = useState(todayIso());
  const [daysOff, setDaysOff] = useState("");
  const [types, setTypes] = useState<TypeRow[]>([makeEmptyType()]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (medicine) {
      setName(medicine.name);
      setCycleStartDate(medicine.cycleStartDate);
      setDaysOff(String(medicine.daysOff));
      setTypes(
        initialTypes && initialTypes.length > 0
          ? initialTypes.map((type) => ({
              key: crypto.randomUUID(),
              name: type.name ?? "",
              color: type.color,
              days: String(type.days),
            }))
          : [makeEmptyType()]
      );
    } else {
      setName("");
      setCycleStartDate(todayIso());
      setDaysOff("");
      setTypes([makeEmptyType()]);
    }
    setErrors({});
  }, [isOpen, medicine, initialTypes]);

  function updateType(key: string, patch: Partial<Omit<TypeRow, "key">>) {
    setTypes((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    if (errors.typeDays?.[key]) {
      setErrors((prev) => {
        if (!prev.typeDays) return prev;
        const nextTypeDays = { ...prev.typeDays };
        delete nextTypeDays[key];
        return { ...prev, typeDays: nextTypeDays };
      });
    }
  }

  function addType() {
    setTypes((prev) => [...prev, makeEmptyType()]);
  }

  function removeType(key: string) {
    setTypes((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";

    const daysOffNum = Number(daysOff);
    if (!daysOff.trim() || !Number.isInteger(daysOffNum) || daysOffNum < 0) {
      next.daysOff = "Must be zero or a positive integer";
    }

    const typeDaysErrors: Record<string, string> = {};
    for (const row of types) {
      const daysNum = Number(row.days);
      if (!row.days.trim() || !Number.isInteger(daysNum) || daysNum <= 0) {
        typeDaysErrors[row.key] = "Must be a positive integer";
      }
    }
    if (Object.keys(typeDaysErrors).length > 0) next.typeDays = typeDaysErrors;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearFieldError(field: "name" | "daysOff") {
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
          cycleStartDate,
          daysOff: Number(daysOff),
          types: types.map((row) => ({
            name: row.name.trim() || null,
            color: row.color,
            days: Number(row.days),
          })),
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
            if (errors.name) clearFieldError("name");
          }}
        />
        {errors.name && <p className="text-xs text-(--red-500)">{errors.name}</p>}
      </div>

      <DatePicker value={cycleStartDate} onChange={setCycleStartDate} />

      <div className="flex flex-col gap-3">
        {types.map((row, index) => (
          <div key={row.key} className="flex flex-col gap-2 rounded-[10px] bg-(--surface-150) p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-(--grey-700)">Type {index + 1}</span>
              {types.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeType(row.key)}
                  aria-label={`Remove type ${index + 1}`}
                  className="text-(--grey-500) hover:text-(--red-500)"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput
                  placeholder={`Type ${index + 1} (optional)`}
                  value={row.name}
                  onChange={(v) => updateType(row.key, { name: v })}
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  value={row.days}
                  onChange={(e) => updateType(row.key, { days: e.target.value })}
                  placeholder="Days"
                  className={numberInputClass}
                />
              </div>
            </div>
            {errors.typeDays?.[row.key] && (
              <p className="text-xs text-(--red-500)">{errors.typeDays[row.key]}</p>
            )}

            <ColorPicker value={row.color} onChange={(color) => updateType(row.key, { color })} />
          </div>
        ))}

        <button
          type="button"
          onClick={addType}
          className="self-start text-sm font-medium text-(--grey-700) hover:text-(--grey-900)"
        >
          + Add type
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="number"
          value={daysOff}
          onChange={(e) => {
            setDaysOff(e.target.value);
            if (errors.daysOff) clearFieldError("daysOff");
          }}
          placeholder="Days off"
          className={numberInputClass}
        />
        {errors.daysOff && <p className="text-xs text-(--red-500)">{errors.daysOff}</p>}
      </div>
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

"use client";

import { createHabitAction, updateHabitAction } from "@/lib/actions";
import type { Habit } from "@/lib/queries";
import { ActionModal, Select, SelectItem, TextInput, Textarea, Tooltip } from "@jf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ColorPicker, DEFAULT_HABIT_COLOR } from "./color-picker";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  habit?: Habit;
};

type FormErrors = {
  name?: string;
  type?: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HabitFormModal({ isOpen, onClose, habit }: Props) {
  const isEditMode = !!habit;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [type, setType] = useState<"boolean" | "numeric" | "time" | "">("");
  const [startDate, setStartDate] = useState(todayIso());
  const [color, setColor] = useState(DEFAULT_HABIT_COLOR);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    if (habit) {
      setName(habit.name);
      setType(habit.type);
      setStartDate(habit.startDate);
      setColor(habit.color);
      setDescription(habit.description ?? "");
    } else {
      setName("");
      setType("");
      setStartDate(todayIso());
      setColor(DEFAULT_HABIT_COLOR);
      setDescription("");
    }
    setErrors({});
  }, [isOpen, habit]);

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
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
        const desc = description.trim() || undefined;
        if (isEditMode && habit) {
          await updateHabitAction({
            id: habit.id,
            name: name.trim(),
            type: habit.type,
            startDate: habit.startDate,
            color,
            ...(desc !== undefined ? { description: desc } : {}),
          });
        } else {
          await createHabitAction({
            name: name.trim(),
            type: type as "boolean" | "numeric" | "time",
            startDate,
            color,
            ...(desc !== undefined ? { description: desc } : {}),
          });
        }
        toast.success(isEditMode ? "Habit updated" : "Habit created");
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

      <div className="flex flex-col gap-1">
        {isEditMode ? (
          <Tooltip content="Can't be changed after creation">
            <div className="cursor-not-allowed">
              <div className="pointer-events-none">
                <Select value={type} onValueChange={() => {}} disabled placeholder="Type">
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </Select>
              </div>
            </div>
          </Tooltip>
        ) : (
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as "boolean" | "numeric" | "time");
              if (errors.type) clearError("type");
            }}
            placeholder="Type"
          >
            <SelectItem value="boolean">Boolean</SelectItem>
            <SelectItem value="numeric">Numeric</SelectItem>
            <SelectItem value="time">Time</SelectItem>
          </Select>
        )}
        {errors.type && <p className="text-xs text-(--red-500)">{errors.type}</p>}
      </div>

      <div className="flex flex-col gap-1">
        {isEditMode ? (
          <Tooltip content="Can't be changed after creation">
            <div className="cursor-not-allowed">
              <input
                type="date"
                value={startDate}
                disabled
                className="h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none pointer-events-none opacity-50"
              />
            </div>
          </Tooltip>
        ) : (
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none"
          />
        )}
      </div>

      <ColorPicker value={color} onChange={setColor} />

      <Textarea
        placeholder="Description (optional)"
        value={description}
        onChange={setDescription}
      />
    </div>
  );

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={isEditMode ? "Edit habit" : "New habit"}
      content={content}
      primaryButton={{ label: isEditMode ? "Save" : "Create", loading: isPending, onClick: handleSubmit }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}

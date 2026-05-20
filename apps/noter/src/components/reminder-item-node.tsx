"use client";

import { usePushSubscription } from "@/hooks/use-push-subscription";
import { createReminder, deleteReminder, updateReminder } from "@/lib/reminder-actions";
import type { RepeatRule } from "@/lib/reminder-actions";
import { DatePicker, Select, SelectItem, TimeInput, cn } from "@jf/ui";
import { BellIcon, CheckIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Node view component ──────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeStr(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function ReminderItemNodeView({ node, updateAttributes, deleteNode, extension }: NodeViewProps) {
  const { blockId, reminderId, title, scheduledAt, repeatRule, isDone } = node.attrs as {
    blockId: string;
    reminderId: string | null;
    title: string;
    scheduledAt: string | null;
    repeatRule: RepeatRule;
    isDone: boolean;
  };
  const noteId: string = (extension as { options: { noteId: string } }).options.noteId;

  const { requestPushSubscription } = usePushSubscription();

  const initialDateTime = scheduledAt ? new Date(scheduledAt) : new Date();

  const [pickerOpen, setPickerOpen] = useState(!scheduledAt);
  const [localTitle, setLocalTitle] = useState<string>(title ?? "");
  const [localRepeat, setLocalRepeat] = useState<RepeatRule>(repeatRule ?? "NONE");
  const [localDate, setLocalDate] = useState<string>(toISODate(initialDateTime));
  const [localTime, setLocalTime] = useState<string>(toTimeStr(initialDateTime));

  async function handleConfirm(date: Date) {
    const isoString = date.toISOString();

    if (!reminderId) {
      try {
        const reminder = await createReminder(
          noteId,
          blockId,
          localTitle || "Reminder",
          date,
          localRepeat
        );
        updateAttributes({
          reminderId: reminder.id,
          title: localTitle || "Reminder",
          scheduledAt: isoString,
          repeatRule: localRepeat,
        });
        setPickerOpen(false);
        requestPushSubscription();
      } catch {
        toast.error("Failed to save reminder");
        deleteNode();
      }
    } else {
      await updateReminder(reminderId, {
        title: localTitle || "Reminder",
        scheduledAt: date,
        repeatRule: localRepeat,
      });
      updateAttributes({
        title: localTitle || "Reminder",
        scheduledAt: isoString,
        repeatRule: localRepeat,
      });
      setPickerOpen(false);
    }
  }

  function handleCancel() {
    if (!reminderId) {
      deleteNode();
    } else {
      setLocalTitle(title ?? "");
      setLocalRepeat(repeatRule ?? "NONE");
      setPickerOpen(false);
    }
  }

  function handlePickerConfirm() {
    const parts = localDate.split("-").map(Number);
    const timeParts = localTime.split(":").map(Number);
    const date = new Date(
      parts[0] ?? 0,
      (parts[1] ?? 1) - 1,
      parts[2] ?? 1,
      timeParts[0] ?? 0,
      timeParts[1] ?? 0,
      0,
      0
    );
    handleConfirm(date);
  }

  async function handleDelete() {
    if (reminderId) await deleteReminder(reminderId);
    deleteNode();
  }

  async function handleToggleDone() {
    const next = !isDone;
    if (reminderId) await updateReminder(reminderId, { isDone: next });
    updateAttributes({ isDone: next });
  }

  const formattedDate = scheduledAt
    ? new Date(scheduledAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <NodeViewWrapper>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-(--grey-200)",
          "bg-(--surface-100) px-3 py-2 text-sm",
          isDone && "opacity-50"
        )}
      >
        <BellIcon size={14} className="shrink-0 text-(--grey-500)" />
        <span className={cn("flex-1 truncate", isDone && "line-through text-(--grey-400)")}>
          {title || "Reminder"}
        </span>
        {formattedDate && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setPickerOpen(true);
            }}
            className="shrink-0 text-xs text-(--grey-500) hover:text-(--grey-900)"
          >
            {formattedDate}
          </button>
        )}
        {repeatRule !== "NONE" && (
          <span className="shrink-0 rounded px-1.5 py-0.5 text-xs bg-(--surface-200) text-(--grey-600)">
            {repeatRule.toLowerCase()}
          </span>
        )}
        {reminderId && (
          <div className="flex">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleToggleDone();
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
              title="Toggle done"
            >
              <CheckIcon size={14} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
              title="Delete reminder"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="mt-1 rounded-lg border border-(--grey-200) bg-(--card) overflow-hidden">
          <div className="flex flex-col gap-3 p-3 border-b border-(--grey-200)">
            <input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Reminder title"
              className="rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none"
            />
            <Select
              value={localRepeat}
              onValueChange={(v) => setLocalRepeat(v as RepeatRule)}
              placeholder="Repeat"
            >
              <SelectItem value="NONE">No repeat</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </Select>
            <div className="flex flex-col gap-3 sm:flex-row">
              <DatePicker value={localDate} onChange={setLocalDate} accentColor="var(--primary)" />
              <TimeInput
                value={localTime}
                onChange={setLocalTime}
                accentColor="var(--primary)"
                align="end"
              />
            </div>
          </div>
          <div className="flex flex-row justify-end gap-2 p-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-7 w-7 items-center justify-center rounded text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <XIcon size={14} />
            </button>
            <button
              type="button"
              onClick={handlePickerConfirm}
              className="flex h-7 w-7 items-center justify-center rounded text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <CheckIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// ─── Node extension ───────────────────────────────────────────────────────────

export const ReminderItemExtension = Node.create<{ noteId: string }>({
  name: "reminderItem",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return { noteId: "" };
  },

  addAttributes() {
    return {
      blockId: { default: null },
      reminderId: { default: null },
      title: { default: "" },
      scheduledAt: { default: null },
      repeatRule: { default: "NONE" },
      isDone: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="reminderItem"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", { "data-type": "reminderItem", ...HTMLAttributes }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReminderItemNodeView);
  },
});

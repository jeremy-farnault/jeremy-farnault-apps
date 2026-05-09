"use client";

import { usePushSubscription } from "@/hooks/use-push-subscription";
import { createReminder, deleteReminder, updateReminder } from "@/lib/reminder-actions";
import { DatePicker, Select, SelectItem, cn } from "@jf/ui";
import { BellIcon, CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { Node, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useState } from "react";

type RepeatRule = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

// ─── Node view component ──────────────────────────────────────────────────────

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

  const [pickerOpen, setPickerOpen] = useState(!scheduledAt);
  const [localTitle, setLocalTitle] = useState<string>(title ?? "");
  const [localDate, setLocalDate] = useState<string>(scheduledAt?.split("T")[0] ?? "");
  const [localTime, setLocalTime] = useState<string>(
    scheduledAt ? new Date(scheduledAt).toTimeString().slice(0, 5) : "09:00"
  );
  const [localRepeat, setLocalRepeat] = useState<RepeatRule>(repeatRule ?? "NONE");

  async function handleConfirm() {
    if (!localDate) return;
    const scheduledAtDate = new Date(`${localDate}T${localTime}`);
    const isoString = scheduledAtDate.toISOString();

    if (!reminderId) {
      try {
        const reminder = await createReminder(
          noteId,
          blockId,
          localTitle || "Reminder",
          scheduledAtDate,
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
        deleteNode();
      }
    } else {
      await updateReminder(reminderId, {
        title: localTitle || "Reminder",
        scheduledAt: scheduledAtDate,
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
      setLocalDate(scheduledAt?.split("T")[0] ?? "");
      setLocalRepeat(repeatRule ?? "NONE");
      setPickerOpen(false);
    }
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
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleToggleDone();
          }}
          className="shrink-0 text-(--grey-400) hover:text-(--grey-700)"
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
          className="shrink-0 text-(--grey-400) hover:text-red-500"
          title="Delete reminder"
        >
          <TrashIcon size={14} />
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-1 flex flex-col gap-3 rounded-lg border border-(--grey-200) bg-(--card) p-3">
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="Reminder title"
            className="rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none"
          />
          <DatePicker value={localDate} onChange={setLocalDate} disablePast />
          <input
            type="time"
            value={localTime}
            onChange={(e) => setLocalTime(e.target.value)}
            className="h-11 rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none"
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
          <div className="flex gap-2">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              className="flex-1 rounded-lg bg-(--grey-900) px-3 py-2 text-sm text-(--grey-100)"
            >
              Set reminder
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              className="flex-1 rounded-lg bg-(--surface-200) px-3 py-2 text-sm text-(--grey-700)"
            >
              Cancel
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

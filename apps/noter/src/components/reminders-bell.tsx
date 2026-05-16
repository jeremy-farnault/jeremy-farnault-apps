"use client";

import { updateReminder } from "@/lib/reminder-actions";
import { cn } from "@jf/ui";
import { BellIcon, CheckIcon } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReminderItem = {
  id: string;
  noteId: string;
  title: string;
  scheduledAt: string;
  repeatRule: string;
  noteTitle: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ReminderRowProps = {
  item: ReminderItem;
  onDone: (id: string) => void;
  onClose: () => void;
};

function ReminderRow({ item, onDone, onClose }: ReminderRowProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg p-2 hover:bg-(--surface-100)">
      <a href={`/note/${item.noteId}`} onClick={onClose} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-(--grey-900)">{item.title || "Reminder"}</p>
        {item.noteTitle && <p className="truncate text-xs text-(--grey-500)">{item.noteTitle}</p>}
        <p className="mt-0.5 text-xs text-(--grey-400)">{formatDate(item.scheduledAt)}</p>
      </a>
      <button
        type="button"
        onClick={() => onDone(item.id)}
        className="mt-0.5 shrink-0 rounded p-1 text-(--grey-400) hover:bg-(--surface-200) hover:text-(--grey-700)"
        title="Mark done"
      >
        <CheckIcon size={14} />
      </button>
    </div>
  );
}

export function RemindersBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchReminders = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  useEffect(() => {
    if (!open) return;
    fetchReminders();
  }, [open, fetchReminders]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "REMINDER_RECEIVED") {
        fetchReminders();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [fetchReminders]);

  async function markDone(id: string) {
    await updateReminder(id, { isDone: true });
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  const { due, upcoming } = useMemo(() => {
    const now = new Date();
    return {
      due: items.filter((r) => new Date(r.scheduledAt) <= now),
      upcoming: items.filter((r) => new Date(r.scheduledAt) > now),
    };
  }, [items]);
  const hasDue = due.length > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Reminders"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full",
            "bg-(--surface-150) text-(--grey-700)",
            "hover:bg-(--surface-200) hover:text-(--grey-900)"
          )}
        >
          <BellIcon size={20} />
          {hasDue && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            "z-50 w-80 min-w-[120px] rounded-[22px] bg-(--card) p-4 outline-none",
            "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <p className="mb-3 text-sm font-semibold text-(--grey-900)">Reminders</p>

          {loading && <p className="text-sm text-(--grey-400)">Loading…</p>}

          {!loading && error && <p className="text-sm text-red-500">Failed to load reminders</p>}

          {!loading && !error && items.length === 0 && (
            <p className="text-sm text-(--grey-400)">No reminders</p>
          )}

          {!loading && due.length > 0 && (
            <section>
              <p className="mb-1 text-xs font-medium text-red-500">Due</p>
              {due.map((r) => (
                <ReminderRow key={r.id} item={r} onDone={markDone} onClose={() => setOpen(false)} />
              ))}
            </section>
          )}

          {!loading && due.length > 0 && upcoming.length > 0 && (
            <div className="my-3 h-px bg-(--grey-200)" />
          )}

          {!loading && upcoming.length > 0 && (
            <section>
              <p className="mb-1 text-xs font-medium text-(--grey-500)">Upcoming</p>
              {upcoming.map((r) => (
                <ReminderRow key={r.id} item={r} onDone={markDone} onClose={() => setOpen(false)} />
              ))}
            </section>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

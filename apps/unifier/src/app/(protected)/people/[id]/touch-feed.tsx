"use client";

import { PlainButton } from "@/components/plain-button";
import { backdatedTouchAt, todayISODate } from "@/lib/drift";
import type { TouchRow } from "@/lib/queries";
import { Button, DatePicker, TextInput } from "@jf/ui";
import { ChatCircleTextIcon, HandWavingIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  touches: TouchRow[];
  onLogTouch: (input: { note?: string; occurredAt?: Date }) => Promise<void>;
};

const TIME = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * The contact timeline, most recent first, with logging above it.
 *
 * Unlike the one-tap button on the main page, this one carries a date: contact is often
 * logged days after it happened, or backfilled for someone who was just added. The field
 * stays empty and reads "Today", so the frictionless path is still a single tap — a date
 * is something you reach for, never something you have to dismiss.
 */
export function TouchFeed({ touches, onLogTouch }: Props) {
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  // Only feeds the calendar popover, which renders on open — so reading the clock during
  // render can't produce a server/client mismatch the way a default value would.
  const today = todayISODate(new Date());

  async function log(withNote?: string) {
    if (busy) return;
    setBusy(true);
    try {
      // Blank and today both mean "now", which is what the server stamps by default —
      // that keeps same-day touches on a real clock time and in the order they arrived.
      const occurredAt = date && date !== today ? backdatedTouchAt(date, new Date()) : null;
      await onLogTouch({
        ...(withNote ? { note: withNote } : {}),
        ...(occurredAt ? { occurredAt } : {}),
      });
      setNote("");
      setNoting(false);
      setDate("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Future dates are barred: drift floors at zero, so a touch dated next week
            would read as "Today" and hide how long the real drift has been. */}
        <DatePicker
          value={date}
          onChange={setDate}
          disabled={busy}
          placeholder="Today"
          maxDate={today}
          accentColor="var(--primary)"
          className="sm:w-[170px]"
        />
        {/* One tap, no typing — this has to be frictionless or it won't happen. */}
        <Button
          onClick={() => void log()}
          disabled={busy}
          className="gap-2 transition-transform active:scale-[0.98]"
        >
          <HandWavingIcon size={18} weight="fill" /> Log touch
        </Button>
        <PlainButton
          onClick={() => setNoting((v) => !v)}
          disabled={busy}
          aria-expanded={noting}
          className="h-[42px] self-start sm:self-center"
        >
          <ChatCircleTextIcon size={16} /> Add note
        </PlainButton>
      </div>

      {noting && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <TextInput
            value={note}
            onChange={setNote}
            placeholder="What happened? (optional)"
            autoFocus
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") void log(note);
              if (e.key === "Escape") {
                setNote("");
                setNoting(false);
              }
            }}
          />
          <Button
            onClick={() => void log(note)}
            disabled={busy}
            className="shrink-0 transition-transform active:scale-[0.98]"
          >
            Save
          </Button>
        </div>
      )}

      {touches.length === 0 ? (
        <p className="text-sm text-(--grey-500)">
          No contact logged yet. The first touch starts the timeline.
        </p>
      ) : (
        <ol className="flex flex-col">
          {touches.map((touch, i) => (
            <li key={touch.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={
                    i === 0
                      ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--primary)"
                      : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--grey-300)"
                  }
                  aria-hidden
                />
                {i < touches.length - 1 && <span className="w-px flex-1 bg-(--grey-200)" />}
              </div>
              <div className="flex min-w-0 flex-col pb-4">
                <time
                  dateTime={touch.occurredAt.toISOString()}
                  className="text-xs text-(--grey-500)"
                >
                  {TIME.format(touch.occurredAt)}
                </time>
                {touch.note && (
                  <p className="break-words text-sm text-(--grey-800)">{touch.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

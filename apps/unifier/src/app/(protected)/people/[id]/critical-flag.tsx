"use client";

import { PlainButton } from "@/components/plain-button";
import { formatAgo } from "@/lib/drift";
import { SealWarningIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  important: boolean;
  flaggedAt: Date | null;
  onToggle: (important: boolean) => Promise<void>;
};

/**
 * The critical flag: a pure on/off attention marker, deliberately not a task — no due
 * date, no checkbox, no done-state. Logging a touch never clears it; only the user does,
 * once the underlying situation is genuinely resolved.
 */
export function CriticalFlag({ important, flaggedAt, onToggle }: Props) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(!important);
    } finally {
      setBusy(false);
    }
  }

  if (!important) {
    return (
      <PlainButton
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={false}
        className="self-start"
      >
        <SealWarningIcon size={16} />
        Flag as critical
      </PlainButton>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-(--red-100) px-3 py-2">
      <SealWarningIcon size={20} weight="fill" className="shrink-0 text-(--red-500)" />
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold text-(--red-600)">Critical</span>
        {flaggedAt && (
          <span className="text-xs text-(--red-500)">
            Flagged {formatAgo(flaggedAt, new Date()).toLowerCase()}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed
        className="min-h-11 shrink-0 rounded-[10px] px-3 text-xs font-medium text-(--red-600) transition-[background-color,transform] hover:bg-(--red-200) active:scale-95 disabled:opacity-50"
      >
        Resolved
      </button>
    </div>
  );
}

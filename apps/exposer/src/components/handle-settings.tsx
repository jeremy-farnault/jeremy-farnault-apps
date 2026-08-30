"use client";

import { setHandle } from "@/lib/actions";
import { getHandleError, normalizeHandle } from "@jf/auth/handle";
import { Button, TextInput } from "@jf/ui";
import { useMemo, useState, useTransition } from "react";

export function HandleSettings({ currentHandle }: { currentHandle: string }) {
  const [value, setValue] = useState(currentHandle);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalized = normalizeHandle(value);
  const validationError = useMemo(() => getHandleError(value), [value]);
  const unchanged = normalized === currentHandle;
  const canSubmit = !validationError && !unchanged && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    setServerError(null);
    startTransition(async () => {
      const result = await setHandle(value);
      // A successful call redirects to /[new-handle] and never returns; only errors resolve.
      if (result?.error) setServerError(result.error);
    });
  }

  const shownError = value.length > 0 ? validationError : null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-(--grey-900)">Handle</h2>
      <p className="text-xs text-(--grey-500)">
        Your portfolio&apos;s public address. Changing it frees the old handle immediately.
      </p>

      <div className="flex items-center gap-1 rounded-xl bg-(--surface-150) px-3 py-2">
        <span className="text-sm text-(--grey-500)">exposer.jeremyfarnault.com/</span>
        <TextInput
          value={value}
          onChange={(v) => {
            setValue(v);
            setServerError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) handleSubmit();
          }}
          placeholder="your-handle"
          className="flex-1 bg-transparent px-0"
        />
      </div>

      {(shownError || serverError) && (
        <p className="text-xs text-(--red-500)">{shownError ?? serverError}</p>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit} className="self-start">
        {isPending ? "Saving…" : "Save handle"}
      </Button>
    </section>
  );
}

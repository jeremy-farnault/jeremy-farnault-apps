"use client";

import { setHandle } from "@/lib/actions";
import { getHandleError, normalizeHandle, suggestHandleFromName } from "@jf/auth/handle";
import { Button, TextInput } from "@jf/ui";
import { useMemo, useState, useTransition } from "react";

export function HandleOnboarding({ name }: { name: string }) {
  const [value, setValue] = useState(() => suggestHandleFromName(name));
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalized = normalizeHandle(value);
  const validationError = useMemo(() => getHandleError(value), [value]);
  const canSubmit = !validationError && !isPending;

  function handleSubmit() {
    if (validationError) return;
    setServerError(null);
    startTransition(async () => {
      const result = await setHandle(value);
      // A successful call redirects and never returns; only errors resolve here.
      if (result?.error) setServerError(result.error);
    });
  }

  // Show the live format/reserved message while typing; fall back to the last server error.
  const shownError = value.length > 0 ? validationError : null;

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold text-(--grey-900)">Choose your handle</h1>
          <p className="text-sm text-(--grey-600)">
            This is your portfolio&apos;s public address. You can change it later.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
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
              autoFocus
              className="flex-1 bg-transparent px-0"
            />
          </div>
          {normalized && !validationError && (
            <p className="text-xs text-(--grey-500)">
              Your page: <span className="text-(--grey-700)">/{normalized}</span>
            </p>
          )}
          {(shownError || serverError) && (
            <p className="text-xs text-(--red-500)">{shownError ?? serverError}</p>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} size="lg">
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </main>
  );
}

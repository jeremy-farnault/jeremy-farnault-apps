"use client";

import { Button } from "@jf/ui";
import { AtomIcon } from "@phosphor-icons/react";

/** Shown when the user has no arcs at all — the entry point into their first arc. */
export function FirstRunEmptyState({ onCreateArc }: { onCreateArc: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <AtomIcon size={48} className="text-(--primary)" weight="duotone" />
      <h2 className="text-xl font-semibold text-(--grey-900)">Start with an arc</h2>
      <p className="max-w-sm text-sm leading-relaxed text-(--grey-600)">
        Arcs are how you group the people you care about — Family, Managers, Close Friends. Create
        one, then add the people who belong in it.
      </p>
      <Button onClick={onCreateArc} className="mt-2">
        Create an arc
      </Button>
    </div>
  );
}

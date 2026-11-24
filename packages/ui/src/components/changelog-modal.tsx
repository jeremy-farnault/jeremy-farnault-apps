"use client";

import { XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";
import { ChangelogList, type ChangelogListMonth } from "./changelog";

/**
 * The changelog over the current page, for a link followed inside the app. Apps render it from
 * an intercepting route, so the URL is /changelog and a full load shows the page instead.
 * Closing it (Back, Escape, the close button, a click outside) goes back to the page under it.
 */
export function ChangelogModal({ months }: { months: readonly ChangelogListMonth[] }) {
  const router = useRouter();

  return (
    <Dialog.Root
      defaultOpen
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Dialog.Portal>
        {/* dark-mode-fixed: a black scrim dims the page in both modes. */}
        <Dialog.Overlay className="fixed inset-0 z-[5000] bg-black/40 animate-[overlay-in_0.2s_ease-in-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-[5001] flex flex-col overflow-hidden bg-(--card) shadow-[0_25px_60px_0_rgba(0,0,0,0.35)] outline-none",
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-[24px]",
            "md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-[92vw] md:max-w-[640px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]",
            "animate-[modal-in_0.25s_ease-in-out]"
          )}
        >
          <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
            <Dialog.Title className="text-2xl font-semibold text-(--text)">Changelog</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-(--surface-150) text-(--text-secondary) hover:bg-(--surface-200) hover:text-(--text)"
            >
              <XIcon size={18} weight="bold" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-6 pb-6">
            <ChangelogList months={months} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

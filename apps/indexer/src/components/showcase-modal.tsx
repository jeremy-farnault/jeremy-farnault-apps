"use client";

import type { ShowcaseApp } from "@/config/showcase";
import { cn } from "@jf/ui";
import { XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { AppShowcase } from "./app-showcase";

export function ShowcaseModal({ app }: { app: ShowcaseApp }) {
  const router = useRouter();

  return (
    <Dialog.Root
      defaultOpen
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[5000] bg-black/40 animate-[overlay-in_0.2s_ease-in-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-[5001] overflow-hidden bg-(--card) shadow-[0_25px_60px_0_rgba(0,0,0,0.35)] outline-none",
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-[24px]",
            "md:inset-auto md:left-1/2 md:top-1/2 md:h-[600px] md:max-h-[85vh] md:w-[92vw] md:max-w-[860px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px]",
            "animate-[modal-in_0.25s_ease-in-out]"
          )}
        >
          <Dialog.Title className="sr-only">{app.name}</Dialog.Title>
          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200) hover:text-(--grey-900)"
          >
            <XIcon size={18} weight="bold" />
          </Dialog.Close>
          <AppShowcase app={app} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

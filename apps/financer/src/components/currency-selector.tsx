"use client";

import { setHomeCurrency } from "@/lib/actions";
import { cn } from "@jf/ui";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "SEK", "NZD", "JPY"] as const;

export function CurrencySelector({ homeCurrency }: { homeCurrency: string }) {
  const [open, setOpen] = useState(false);

  async function select(currency: string) {
    setOpen(false);
    await setHomeCurrency(currency);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Select home currency"
          className="flex h-10 min-w-10 items-center justify-center rounded-full bg-(--surface-150) px-3 text-xs font-semibold text-(--grey-700) hover:bg-(--surface-200) hover:text-(--grey-900)"
        >
          {homeCurrency}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            "z-50 w-40 rounded-[22px] bg-(--card) p-2 outline-none",
            "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => select(c)}
              className={cn(
                "w-full rounded-[10px] px-3 py-2 text-left text-sm transition-colors",
                c === homeCurrency
                  ? "bg-(--primary) font-semibold text-white"
                  : "text-(--grey-700) hover:bg-(--surface-100)"
              )}
            >
              {c}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

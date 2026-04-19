"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { cn } from "../lib/utils";

interface UserMenuProps {
  email: string;
  name?: string;
  onLogout: () => void;
}

export function UserMenu({ email, name, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const letter = name?.[0] ?? email.split("@")[0]?.[0] ?? "?";

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label="Open user menu"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-(--surface-150)",
            "hover:bg-(--surface-200)"
          )}
          type="button"
        >
          <span className="text-xl font-semibold uppercase text-(--primary)">{letter}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 rounded-[22px] bg-(--card) p-2",
            "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]",
            "outline-none min-w-[140px]"
          )}
        >
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={cn(
              "w-full rounded-[14px] px-4 py-2.5 text-left text-sm text-(--grey-900)",
              "hover:bg-(--surface-150)"
            )}
            type="button"
          >
            Log out
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

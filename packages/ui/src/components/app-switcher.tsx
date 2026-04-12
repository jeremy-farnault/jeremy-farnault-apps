"use client";

import { SquaresFourIcon } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { apps } from "../config/apps";
import { cn } from "../lib/utils";

interface AppSwitcherProps {
  currentAppId?: string;
  className?: string;
}

export function AppSwitcher({ currentAppId, className }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          aria-label="Open app switcher"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-(--surface-150) text-(--grey-700)",
            "hover:bg-(--surface-200) hover:text-(--grey-900)",
            className
          )}
          type="button"
        >
          <SquaresFourIcon size={20} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 rounded-[22px] bg-(--card) p-3",
            "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]",
            "outline-none"
          )}
        >
          <div className="grid grid-cols-3 gap-2">
            {apps.map((app) => (
              <a
                key={app.id}
                href={app.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-[14px] p-3 text-[10px] text-(--grey-900)",
                  "hover:bg-(--surface-150)",
                  currentAppId === app.id && "bg-(--surface-150) font-semibold"
                )}
              >
                <app.icon size={24} />
                {app.name}
              </a>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

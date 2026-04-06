"use client";

import { SquaresFourIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { apps } from "../config/apps";
import { cn } from "../lib/utils";
import { ActionModal } from "./action-modal";

interface AppSwitcherProps {
  currentAppId?: string;
  className?: string;
}

export function AppSwitcher({ currentAppId, className }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);

  const grid = (
    <div className="grid grid-cols-3 gap-2">
      {apps.map((app) => (
        <a
          key={app.id}
          href={app.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-[14px] p-3 text-sm text-(--grey-900)",
            "hover:bg-(--surface-100)",
            currentAppId === app.id && "bg-(--surface-100) font-semibold"
          )}
        >
          <app.icon size={24} />
          {app.name}
        </a>
      ))}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open app switcher"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          "bg-(--surface-100) text-(--grey-700)",
          "hover:bg-(--surface-150) hover:text-(--grey-900)",
          className
        )}
        type="button"
      >
        <SquaresFourIcon size={20} />
      </button>

      <ActionModal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="small"
        title="Apps"
        content={grid}
      />
    </>
  );
}

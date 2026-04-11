"use client";

import { CircleNotchIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface FloatingCTAProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function FloatingCTA({ label, icon, onClick, disabled, loading }: FloatingCTAProps) {
  return (
    <div
      className="fixed bottom-8 left-1/2 z-50"
      style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      <button
        onClick={onClick}
        disabled={disabled ?? loading}
        className={cn(
          "flex h-14 items-center gap-2 rounded-xl px-7",
          "bg-(--primary) text-(--primary-foreground) text-sm font-semibold",
          "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
          "hover:bg-(--secondary)",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        type="submit"
      >
        {loading ? <CircleNotchIcon size={20} className="animate-spin" /> : icon}
        {label}
      </button>
    </div>
  );
}

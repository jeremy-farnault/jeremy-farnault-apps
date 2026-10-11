"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { THEMES, type Theme } from "../lib/theme";
import { applyTheme } from "../lib/theme-runtime";
import { cn } from "../lib/utils";
import { useResolvedTheme } from "./themed-toaster";

const OPTIONS: Record<Theme, { label: string; Icon: typeof SunIcon }> = {
  light: { label: "Light", Icon: SunIcon },
  dark: { label: "Dark", Icon: MoonIcon },
  system: { label: "System", Icon: DesktopIcon },
};

type ThemeToggleProps = {
  /**
   * Saves the preference (`setTheme` from `@jf/auth/settings-actions`). Passed in so @jf/ui
   * stays free of auth and database code. A rejection reverts the page and the control.
   */
  onChange: (theme: Theme) => Promise<void>;
};

/**
 * Light / Dark / System, as native radios: Tab reaches the group, arrow keys move and select.
 * The page switches as soon as an option is picked; the save runs behind it.
 */
export function ThemeToggle({ onChange }: ThemeToggleProps) {
  // The popover only mounts on the client, after the head script has run.
  const [preference, setPreference] = useState<Theme>(
    () => window.__jfTheme?.preference() ?? "system"
  );
  const resolved = useResolvedTheme();

  async function select(next: Theme) {
    if (next === preference) return;
    const previous = preference;
    setPreference(next);
    applyTheme(next);
    try {
      await onChange(next);
    } catch {
      setPreference(previous);
      applyTheme(previous);
      toast.error("Couldn't save your theme. Try again.");
    }
  }

  return (
    <div className="px-2 py-1.5">
      <fieldset className="flex gap-1 rounded-[14px] bg-(--surface-sunken) p-1">
        <legend className="sr-only">Theme</legend>
        {THEMES.map((theme) => {
          const { label, Icon } = OPTIONS[theme];
          const checked = theme === preference;
          return (
            <label
              key={theme}
              className={cn(
                "flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-xs font-medium",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring)",
                checked
                  ? "card-raised bg-(--surface-raised) text-(--text)"
                  : "text-(--text-muted) hover:text-(--text)"
              )}
            >
              <input
                type="radio"
                name="jf-theme"
                value={theme}
                checked={checked}
                onChange={() => void select(theme)}
                className="sr-only"
              />
              <Icon size={16} weight={checked ? "fill" : "regular"} aria-hidden />
              {label}
            </label>
          );
        })}
      </fieldset>
      {preference === "system" && (
        <p className="mt-1.5 px-1 text-xs text-(--text-muted)" aria-live="polite">
          Following your device: currently {resolved}
        </p>
      )}
    </div>
  );
}

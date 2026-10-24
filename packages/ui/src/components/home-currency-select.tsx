"use client";

import { CoinsIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export type HomeCurrencySetting = { currency: string; options: readonly string[] };

type HomeCurrencySelectProps = {
  /**
   * Reads the saved currency and the choices (`getHomeCurrencySetting` from
   * `@jf/auth/settings-actions`). Passed in, like the theme's save, so @jf/ui stays free of
   * auth and database code.
   */
  load: () => Promise<HomeCurrencySetting | null>;
  /** Saves a new currency (`setHomeCurrency`). A rejection reverts the control. */
  onChange: (currency: string) => Promise<void>;
};

/**
 * The currency amounts are converted to, across the fleet. A native select, so it opens as
 * the platform's own picker and doesn't fight the user menu's popover for focus or clicks.
 * Nothing shows until the saved value has loaded.
 */
export function HomeCurrencySelect({ load, onChange }: HomeCurrencySelectProps) {
  const [setting, setSetting] = useState<HomeCurrencySetting | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((loaded) => {
        if (!cancelled) setSetting(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!setting) return null;

  async function select(next: string) {
    if (!setting || next === setting.currency) return;
    const previous = setting.currency;
    setSetting({ ...setting, currency: next });
    try {
      await onChange(next);
    } catch {
      setSetting((s) => (s ? { ...s, currency: previous } : s));
      toast.error("Couldn't save your currency. Try again.");
    }
  }

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm text-(--text)",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring)"
      )}
    >
      <CoinsIcon size={18} weight="bold" aria-hidden />
      <span className="flex-1">Currency</span>
      <select
        value={setting.currency}
        onChange={(e) => void select(e.target.value)}
        className="cursor-pointer rounded-[10px] bg-(--surface-sunken) px-2 py-1 text-xs font-medium text-(--text) outline-none"
      >
        {setting.options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

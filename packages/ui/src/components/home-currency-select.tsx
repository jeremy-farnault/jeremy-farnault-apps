"use client";

import { CaretDownIcon, CoinsIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { Skeleton } from "./skeleton";

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
 * The row is there from the start, with a placeholder until the saved value has loaded, so
 * the menu doesn't shift.
 */
export function HomeCurrencySelect({ load, onChange }: HomeCurrencySelectProps) {
  const [setting, setSetting] = useState<HomeCurrencySetting | null>(null);
  const [failed, setFailed] = useState(false);
  const selectId = useId();

  useEffect(() => {
    let cancelled = false;
    load()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) setSetting(loaded);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (failed) return null;

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
      htmlFor={selectId}
      className={cn(
        "flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm text-(--text)",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring)"
      )}
    >
      <CoinsIcon size={18} weight="bold" aria-hidden />
      <span className="flex-1">Currency</span>
      {setting ? (
        <span className="relative flex items-center">
          <select
            id={selectId}
            value={setting.currency}
            onChange={(e) => void select(e.target.value)}
            className={cn(
              "cursor-pointer appearance-none rounded-[10px] bg-(--surface-sunken) py-1 pl-2 pr-6",
              "text-xs font-medium text-(--text) outline-none"
            )}
          >
            {setting.options.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {/* The native arrow ignores padding, so it's hidden and drawn here instead. */}
          <CaretDownIcon
            size={12}
            weight="bold"
            aria-hidden
            className="pointer-events-none absolute right-2 text-(--text-muted)"
          />
        </span>
      ) : (
        <Skeleton height={24} width={56} className="rounded-[10px]" />
      )}
    </label>
  );
}

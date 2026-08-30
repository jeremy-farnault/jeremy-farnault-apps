"use client";

import type { Tag } from "@/lib/tag-actions";
import { TextInput } from "@jf/ui";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  available: Tag[];
  selected: string[];
  onChange: (names: string[]) => void;
  disabled?: boolean;
};

export function TagField({ available, selected, onChange, disabled = false }: Props) {
  const [draft, setDraft] = useState("");

  function colorFor(name: string): string | null {
    return available.find((t) => t.name === name)?.color ?? null;
  }

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setDraft("");
  }

  function remove(name: string) {
    onChange(selected.filter((n) => n !== name));
  }

  const suggestions = available.filter((t) => !selected.includes(t.name));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-(--grey-500)">Tags</span>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const color = colorFor(name);
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-full bg-(--surface-200) px-2 py-0.5 text-xs text-(--grey-800)"
              >
                {color && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                )}
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  disabled={disabled}
                  onClick={() => remove(name)}
                  className="text-(--grey-500) hover:text-(--grey-900)"
                >
                  <XIcon size={11} weight="bold" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <TextInput
        value={draft}
        onChange={setDraft}
        placeholder="Add a tag and press Enter"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
      />

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              onClick={() => add(tag.name)}
              className="inline-flex items-center gap-1 rounded-full border border-(--grey-300) px-2 py-0.5 text-xs text-(--grey-600) hover:border-(--grey-400) hover:text-(--grey-900) disabled:opacity-50"
            >
              <PlusIcon size={10} weight="bold" />
              {tag.color && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                  aria-hidden
                />
              )}
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

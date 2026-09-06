"use client";

import type { TagRow } from "@/lib/queries";
import { TextInput } from "@jf/ui";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

export function TagField({
  allTags,
  value,
  onChange,
  onCreateTag,
}: {
  allTags: TagRow[];
  value: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag: (name: string) => Promise<TagRow>;
}) {
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedTags = value
    .map((id) => allTags.find((t) => t.id === id))
    .filter((t): t is TagRow => Boolean(t));

  const query = draft.trim().toLowerCase();
  const suggestions = allTags.filter(
    (t) => !value.includes(t.id) && (query === "" || t.name.toLowerCase().includes(query))
  );
  const exactMatch = allTags.find((t) => t.name.toLowerCase() === query);

  function attach(id: string) {
    if (!value.includes(id)) onChange([...value, id]);
    setDraft("");
  }

  function detach(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  async function createAndAttach() {
    const name = draft.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(name);
      attach(tag.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function handleEnter() {
    const name = draft.trim();
    if (!name) return;
    if (exactMatch) {
      attach(exactMatch.id);
    } else {
      void createAndAttach();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-(--grey-500)">Tags</span>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-(--surface-200) px-2 py-0.5 text-xs text-(--grey-800)"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden
              />
              {tag.name}
              <button
                type="button"
                aria-label={`Remove ${tag.name}`}
                onClick={() => detach(tag.id)}
                className="text-(--grey-500) hover:text-(--grey-900)"
              >
                <XIcon size={11} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}

      <TextInput
        value={draft}
        onChange={setDraft}
        placeholder="Add a tag and press Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter();
          }
        }}
      />

      {(suggestions.length > 0 || (query !== "" && !exactMatch)) && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => attach(tag.id)}
              className="inline-flex items-center gap-1 rounded-full border border-(--grey-300) px-2 py-0.5 text-xs text-(--grey-600) hover:border-(--grey-400) hover:text-(--grey-900)"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
                aria-hidden
              />
              {tag.name}
            </button>
          ))}
          {query !== "" && !exactMatch && (
            <button
              type="button"
              disabled={creating}
              onClick={() => void createAndAttach()}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-(--grey-300) px-2 py-0.5 text-xs text-(--grey-600) hover:border-(--grey-400) hover:text-(--grey-900) disabled:opacity-50"
            >
              <PlusIcon size={10} weight="bold" />
              Create “{draft.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}

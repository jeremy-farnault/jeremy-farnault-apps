"use client";

import {
  type Tag,
  createTagAction,
  deleteTagAction,
  renameTagAction,
  setTagColorAction,
} from "@/lib/tag-actions";
import { ActionModal, Button, COLOR_PALETTE, ColorPicker, TextInput } from "@jf/ui";
import { PaletteIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function TagSettings({ initialTags }: { initialTags: Tag[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      const result = (await action()) as { error?: string } | undefined;
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function addTag() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    run(async () => {
      await createTagAction(name);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-(--grey-900)">Tags</h2>
        <div className="flex gap-2">
          <TextInput
            value={newName}
            onChange={setNewName}
            placeholder="New tag name"
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button onClick={addTag} disabled={isPending || !newName.trim()}>
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-(--red-500)">{error}</p>}
      </div>

      {initialTags.length === 0 ? (
        <p className="text-sm text-(--grey-500)">
          No tags yet. Add tags here, or create them while editing a post.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--border)">
          {initialTags.map((tag) => (
            <TagRow key={tag.id} tag={tag} disabled={isPending} run={run} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TagRow({
  tag,
  disabled,
  run,
}: {
  tag: Tag;
  disabled: boolean;
  run: (action: () => Promise<unknown>) => void;
}) {
  const [name, setName] = useState(tag.name);
  const [colorOpen, setColorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function commitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setName(tag.name);
      return;
    }
    run(() => renameTagAction(tag.id, trimmed));
  }

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Set color"
          disabled={disabled}
          onClick={() => setColorOpen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-(--grey-500) hover:bg-(--surface-200)"
        >
          {tag.color ? (
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: tag.color }}
              aria-hidden
            />
          ) : (
            <PaletteIcon size={16} />
          )}
        </button>

        <TextInput
          value={name}
          onChange={setName}
          disabled={disabled}
          className="flex-1"
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />

        <button
          type="button"
          aria-label={`Delete ${tag.name}`}
          disabled={disabled}
          onClick={() => setConfirmDelete(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-(--grey-500) hover:bg-(--surface-200) hover:text-(--red-500)"
        >
          <TrashIcon size={16} />
        </button>
      </div>

      {colorOpen && (
        <div className="flex flex-col gap-2 pl-9">
          <ColorPicker
            palette={COLOR_PALETTE}
            value={tag.color}
            onChange={(color) => {
              setColorOpen(false);
              run(async () => {
                await setTagColorAction(tag.id, color);
              });
            }}
          />
          {tag.color && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setColorOpen(false);
                run(async () => {
                  await setTagColorAction(tag.id, null);
                });
              }}
              className="self-start text-xs text-(--grey-500) hover:text-(--grey-900)"
            >
              No color
            </button>
          )}
        </div>
      )}

      <ActionModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="small"
        title="Delete tag"
        paragraph={`Delete "${tag.name}"? It will be removed from all posts. The posts themselves are kept.`}
        primaryButton={{
          label: "Delete",
          onClick: () => {
            setConfirmDelete(false);
            run(async () => {
              await deleteTagAction(tag.id);
            });
          },
        }}
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmDelete(false) }}
      />
    </li>
  );
}

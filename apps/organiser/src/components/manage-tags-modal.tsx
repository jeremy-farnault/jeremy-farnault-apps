"use client";

import type { TagRow } from "@/lib/queries";
import { ActionModal, Button, COLOR_PALETTE, ColorPicker, TextInput } from "@jf/ui";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

export function ManageTagsModal({
  tags,
  usage,
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  tags: TagRow[];
  usage: Record<string, number>;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (tagId: string, input: { name: string; color: string }) => Promise<void>;
  onDelete: (tagId: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addTag() {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await onCreate(name);
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Manage tags"
      content={
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <TextInput
              value={newName}
              onChange={setNewName}
              placeholder="New tag name"
              disabled={adding}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addTag();
                }
              }}
            />
            <Button onClick={() => void addTag()} disabled={adding || !newName.trim()}>
              Add
            </Button>
          </div>

          {tags.length === 0 ? (
            <p className="text-sm text-(--grey-500)">
              No tags yet. Add one here, or create tags while editing a card.
            </p>
          ) : (
            <ul className="flex max-h-[50vh] flex-col divide-y divide-(--grey-200) overflow-y-auto">
              {tags.map((tag) => (
                <ManageTagRow
                  key={tag.id}
                  tag={tag}
                  count={usage[tag.id] ?? 0}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      }
      secondaryButton={{ label: "Done", onClick: onClose }}
    />
  );
}

function ManageTagRow({
  tag,
  count,
  onUpdate,
  onDelete,
}: {
  tag: TagRow;
  count: number;
  onUpdate: (tagId: string, input: { name: string; color: string }) => Promise<void>;
  onDelete: (tagId: string) => Promise<void>;
}) {
  const [name, setName] = useState(tag.name);
  const [colorOpen, setColorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(input: { name: string; color: string }) {
    try {
      await onUpdate(tag.id, input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function commitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setName(tag.name);
      return;
    }
    void save({ name: trimmed, color: tag.color });
  }

  return (
    <li className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Set colour"
          onClick={() => setColorOpen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-(--surface-200)"
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: tag.color }}
            aria-hidden
          />
        </button>

        <TextInput
          value={name}
          onChange={setName}
          className="flex-1"
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />

        <span className="w-16 shrink-0 text-right text-xs text-(--grey-500)">
          {count} {count === 1 ? "card" : "cards"}
        </span>

        <button
          type="button"
          aria-label={`Delete ${tag.name}`}
          onClick={() => setConfirmDelete(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-(--grey-500) hover:bg-(--surface-200) hover:text-(--red-500)"
        >
          <TrashIcon size={16} />
        </button>
      </div>

      {colorOpen && (
        <div className="pl-9">
          <ColorPicker
            palette={COLOR_PALETTE}
            value={tag.color}
            onChange={(color) => {
              setColorOpen(false);
              void save({ name: tag.name, color });
            }}
          />
        </div>
      )}

      <ActionModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="small"
        title={`Delete “${tag.name}”?`}
        paragraph="It will be removed from every card. The cards themselves are kept."
        primaryButton={{
          label: "Delete",
          onClick: () => {
            setConfirmDelete(false);
            void onDelete(tag.id).catch((err) =>
              toast.error(err instanceof Error ? err.message : "Something went wrong")
            );
          },
        }}
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmDelete(false) }}
      />
    </li>
  );
}

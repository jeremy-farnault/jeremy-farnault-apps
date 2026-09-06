"use client";

import type { CardRow, TagRow } from "@/lib/queries";
import {
  ActionModal,
  COLOR_PALETTE,
  ColorPicker,
  DatePicker,
  Select,
  SelectItem,
  TextInput,
  cn,
} from "@jf/ui";
import {
  FormattingToolbar,
  RichTextEditor,
  useRichTextEditor,
} from "@jf/ui/components/rich-text-editor";
import { extractPlainText } from "@jf/ui/rich-text";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { TagField } from "./tag-field";

// Editable-surface chrome layered on top of the shared editor's generic prose styling.
const CARD_EDITOR_CLASS = cn(
  "w-full min-h-[120px] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
  "prose prose-sm max-w-none",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li]:my-0.5",
  "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]"
);

export function CardDetailModal({
  card,
  columns,
  allTags,
  initialTagIds,
  onClose,
  onSave,
  onCreateTag,
  onDelete,
}: {
  card: CardRow;
  columns: { id: string; name: string }[];
  allTags: TagRow[];
  initialTagIds: string[];
  onClose: () => void;
  onSave: (input: {
    title: string;
    body: string | null;
    color: string | null;
    deadline: string | null;
    columnId: string;
    tagIds: string[];
  }) => Promise<void>;
  onCreateTag: (name: string) => Promise<TagRow>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState<string | null>(card.body);
  const [color, setColor] = useState<string | null>(card.color);
  const [deadline, setDeadline] = useState(card.deadline ?? "");
  const [columnId, setColumnId] = useState(card.columnId);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editor = useRichTextEditor({
    content: card.body,
    onChange: setBody,
    editorClass: CARD_EDITOR_CLASS,
  });

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    // An emptied editor still yields a doc JSON string; store it as null instead.
    const normalizedBody = body && extractPlainText(body).trim() ? body : null;
    setSaving(true);
    try {
      await onSave({
        title: trimmed,
        body: normalizedBody,
        color,
        deadline: deadline || null,
        columnId,
        tagIds,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ActionModal
        isOpen
        onClose={onClose}
        size="large"
        title="Edit card"
        mobilePosition="top"
        fitMobileViewport
        headerActions={
          <button
            type="button"
            aria-label="Delete card"
            onClick={() => setConfirmingDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-(--grey-500) hover:text-(--red-500)"
          >
            <TrashIcon size={16} />
          </button>
        }
        content={
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <TextInput value={title} onChange={setTitle} placeholder="Card title" autoFocus />

            <div className="flex flex-col gap-2">
              <span className="text-xs text-(--grey-500)">Description</span>
              <RichTextEditor editor={editor} placeholder="Add a description…" />
              <FormattingToolbar editor={editor} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-(--grey-500)">Column</span>
              <Select value={columnId} onValueChange={setColumnId} placeholder="Choose a column">
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <TagField
              allTags={allTags}
              value={tagIds}
              onChange={setTagIds}
              onCreateTag={onCreateTag}
            />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--grey-500)">Deadline</span>
                {deadline && (
                  <button
                    type="button"
                    onClick={() => setDeadline("")}
                    className="text-xs text-(--grey-500) hover:text-(--grey-800)"
                  >
                    Clear
                  </button>
                )}
              </div>
              <DatePicker
                value={deadline}
                onChange={setDeadline}
                accentColor="var(--blue-600)"
                placeholder="No deadline"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--grey-500)">Colour</span>
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className="text-xs text-(--grey-500) hover:text-(--grey-800)"
                >
                  No colour
                </button>
              </div>
              <ColorPicker palette={COLOR_PALETTE} value={color} onChange={setColor} />
            </div>
          </div>
        }
        primaryButton={{ label: "Save", loading: saving, onClick: () => void handleSave() }}
        secondaryButton={{ label: "Cancel", onClick: onClose }}
      />

      <ActionModal
        isOpen={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        size="small"
        title="Delete this card?"
        paragraph="This card will be permanently removed."
        primaryButton={{
          label: "Delete card",
          loading: deleting,
          onClick: () => void handleDelete(),
        }}
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmingDelete(false) }}
      />
    </>
  );
}

"use client";

import { cn } from "@jf/ui";
import {
  type Editor,
  RichTextEditor,
  FormattingToolbar as SharedFormattingToolbar,
  ToolbarButton,
  useRichTextEditor,
} from "@jf/ui/components/rich-text-editor";
import { BellIcon } from "@phosphor-icons/react";
import { ReminderItemExtension } from "./reminder-item-node";

export { RichTextEditor };

// Noter's editable-surface chrome (background/padding/min-height) layered on top of the
// shared editor's generic prose styling.
const NOTE_EDITOR_CLASS = cn(
  "w-full min-h-full sm:min-h-[inherit] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
  "prose prose-sm max-w-none",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li]:my-0.5",
  "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]"
);

export function useNoteEditor(
  initialContent: string | null,
  onChange: (json: string) => void,
  noteId = ""
): Editor | null {
  return useRichTextEditor({
    content: initialContent,
    onChange,
    editorClass: NOTE_EDITOR_CLASS,
    extensions: [ReminderItemExtension.configure({ noteId })],
  });
}

export function FormattingToolbar({
  editor,
  noteId = "",
}: {
  editor: Editor | null;
  noteId?: string;
}) {
  if (!editor) return null;

  return (
    <SharedFormattingToolbar editor={editor}>
      <ToolbarButton
        active={editor.isActive("reminderItem")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent({ type: "reminderItem", attrs: { blockId: crypto.randomUUID() } })
            .run()
        }
        title="Add reminder"
        disabled={!noteId}
      >
        <BellIcon size={14} />
      </ToolbarButton>
    </SharedFormattingToolbar>
  );
}

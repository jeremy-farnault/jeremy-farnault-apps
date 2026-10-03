"use client";

import { cn } from "@jf/ui";
import {
  EDITOR_PROSE_CLASS,
  type Editor,
  EditorCharacterCount,
  RichTextEditor,
  FormattingToolbar as SharedFormattingToolbar,
  type SlashCommand,
  ToolbarButton,
  useRichTextEditor,
} from "@jf/ui/components/rich-text-editor";
import { BellIcon } from "@phosphor-icons/react";
import { ReminderItemExtension } from "./reminder-item-node";

export { EditorCharacterCount, RichTextEditor };

// Noter's editable-surface chrome, composed with the shared prose styling.
const NOTE_EDITOR_CLASS = cn(
  "w-full min-h-full sm:min-h-[inherit] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
  EDITOR_PROSE_CLASS
);

/**
 * `/reminder`, the insertion path `reminder-blocks.md` originally specified. The toolbar's bell
 * stays: both reach the same node with a fresh `blockId`.
 */
const REMINDER_COMMAND: SlashCommand = {
  title: "Reminder",
  keywords: ["bell", "remind", "due", "date"],
  icon: BellIcon,
  run: (editor) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "reminderItem", attrs: { blockId: crypto.randomUUID() } })
      .run();
  },
};

export function useNoteEditor(
  initialContent: string | null,
  onChange: (json: string) => void,
  noteId = ""
): Editor | null {
  return useRichTextEditor({
    content: initialContent,
    onChange,
    editorClass: NOTE_EDITOR_CLASS,
    placeholder: "Write something…",
    features: {
      highlight: true,
      textColor: true,
      characterCount: true,
      bubbleMenu: true,
      slashMenu: true,
    },
    // Gated on `noteId` the way the toolbar's bell is: a reminder needs a note to belong to.
    slashCommands: noteId ? [REMINDER_COMMAND] : [],
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

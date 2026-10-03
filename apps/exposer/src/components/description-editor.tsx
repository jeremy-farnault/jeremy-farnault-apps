"use client";

import { cn } from "@jf/ui";
import {
  EDITOR_PROSE_CLASS,
  FormattingToolbar,
  RichTextEditor,
  useRichTextEditor,
} from "@jf/ui/components/rich-text-editor";

// The description field's chrome, composed with the shared prose styling.
const EXPOSER_EDITOR_CLASS = cn(
  "min-h-[80px] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
  EDITOR_PROSE_CLASS
);

type Props = {
  initialContent: string | null;
  onChange: (json: string) => void;
};

/**
 * The item description editor. Mounted fresh (via `key`) each time the modal opens so it
 * seeds from `initialContent` — no reminder node (no `extensions`), no reminder toolbar
 * button (no `children`).
 */
export function DescriptionEditor({ initialContent, onChange }: Props) {
  const editor = useRichTextEditor({
    content: initialContent,
    onChange,
    editorClass: EXPOSER_EDITOR_CLASS,
    placeholder: "Description (optional)",
  });

  return (
    <div className="flex flex-col gap-2">
      <RichTextEditor editor={editor} />
      <FormattingToolbar editor={editor} />
    </div>
  );
}

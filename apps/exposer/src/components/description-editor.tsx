"use client";

import {
  FormattingToolbar,
  RichTextEditor,
  useRichTextEditor,
} from "@jf/ui/components/rich-text-editor";

// Container chrome + the generic prose/list/task classes (the shared hook's `editorClass`
// fully overrides its default, so the prose classes are replicated here).
const EXPOSER_EDITOR_CLASS = [
  "min-h-[80px] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
  "prose prose-sm max-w-none",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li]:my-0.5",
  "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]",
].join(" ");

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
  });

  return (
    <div className="flex flex-col gap-2">
      <RichTextEditor editor={editor} placeholder="Description (optional)" />
      <FormattingToolbar editor={editor} />
    </div>
  );
}

"use client";

import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import {
  type Editor,
  EditorContent,
  type Extensions,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";

export type { Editor, Extensions } from "@tiptap/react";
import { isRichTextJson, wrapPlainTextAsDoc } from "../lib/rich-text";
import { cn } from "../lib/utils";
import { TaskItemNode } from "./task-item-node";

function parseInitial(body: string | null): object | string {
  if (!body) return "";
  if (isRichTextJson(body)) return JSON.parse(body);
  return JSON.parse(wrapPlainTextAsDoc(body));
}

// Generic prose styling shared by every consumer. App-specific container chrome
// (background, padding, min-height) is layered on by passing `editorClass`.
const DEFAULT_EDITOR_CLASS = cn(
  "w-full outline-none",
  "prose prose-sm max-w-none",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li]:my-0.5",
  "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]"
);

export type UseRichTextEditorOptions = {
  content: string | null;
  onChange: (json: string) => void;
  /** App-specific nodes/marks injected alongside the generic base extensions. */
  extensions?: Extensions;
  /** Overrides the class applied to the editable surface. */
  editorClass?: string;
};

export function useRichTextEditor({
  content,
  onChange,
  extensions,
  editorClass,
}: UseRichTextEditorOptions): Editor | null {
  return useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.extend({
        addNodeView() {
          return ReactNodeViewRenderer(TaskItemNode);
        },
      }).configure({ nested: false }),
      ...(extensions ?? []),
    ],
    content: parseInitial(content),
    editorProps: {
      attributes: {
        class: editorClass ?? DEFAULT_EDITOR_CLASS,
      },
    },
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });
}

type ToolbarButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
  disabled?: boolean;
};

export function ToolbarButton({ active, onClick, children, title, disabled }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition-colors",
        active
          ? "bg-(--surface-300) text-(--grey-900)"
          : "text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)",
        disabled && "pointer-events-none opacity-30"
      )}
    >
      {children}
    </button>
  );
}

type RichTextEditorProps = {
  editor: Editor | null;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
};

export function RichTextEditor({
  editor,
  placeholder,
  className,
  containerClassName,
}: RichTextEditorProps) {
  const doc = editor?.state.doc;
  const isEmpty =
    !doc ||
    (doc.childCount === 1 &&
      doc.firstChild?.type.name === "paragraph" &&
      doc.firstChild?.content.size === 0);

  return (
    <div className={cn("relative", containerClassName)}>
      {isEmpty && placeholder && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-(--grey-400)">
          {placeholder}
        </span>
      )}
      <EditorContent editor={editor} className={className} />
    </div>
  );
}

type FormattingToolbarProps = {
  editor: Editor | null;
  /** App-specific trailing buttons (e.g. Noter's reminder), shown after a divider. */
  children?: ReactNode;
};

export function FormattingToolbar({ editor, children }: FormattingToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 border-t border-(--grey-200) pt-2">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-(--grey-200)" />
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        H3
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-(--grey-200)" />
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        •≡
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered list"
      >
        1≡
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Todo list"
      >
        ☑
      </ToolbarButton>
      {children && (
        <>
          <div className="mx-1 h-4 w-px bg-(--grey-200)" />
          {children}
        </>
      )}
    </div>
  );
}

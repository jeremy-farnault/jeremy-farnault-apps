"use client";

import { isRichTextJson, wrapPlainTextAsDoc } from "@/lib/note-body-utils";
import { cn } from "@jf/ui";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  initialContent: string | null;
  onChange: (json: string) => void;
  placeholder?: string;
  className?: string;
};

function parseInitial(body: string | null): object | string {
  if (!body) return "";
  if (isRichTextJson(body)) return JSON.parse(body);
  return JSON.parse(wrapPlainTextAsDoc(body));
}

type BubbleButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
};

function BubbleButton({ active, onClick, children, title }: BubbleButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-xs font-semibold transition-colors",
        active ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ initialContent, onChange, placeholder, className }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Underline],
    content: parseInitial(initialContent),
    editorProps: {
      attributes: {
        class: cn(
          "w-full min-h-[inherit] rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm outline-none",
          "prose prose-sm max-w-none",
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:my-0.5",
          "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]",
          className
        ),
      },
    },
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  const isEmpty = editor?.isEmpty ?? true;

  return (
    <div className="relative">
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-lg bg-(--grey-900) px-1.5 py-1 shadow-lg"
        >
          <BubbleButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            B
          </BubbleButton>
          <BubbleButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <span className="italic">I</span>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <span className="underline">U</span>
          </BubbleButton>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <BubbleButton
            active={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            H1
          </BubbleButton>
          <BubbleButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            H2
          </BubbleButton>
          <BubbleButton
            active={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            H3
          </BubbleButton>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <BubbleButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            •≡
          </BubbleButton>
          <BubbleButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
          >
            1≡
          </BubbleButton>
        </BubbleMenu>
      )}
      {isEmpty && placeholder && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-(--grey-400)">
          {placeholder}
        </span>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

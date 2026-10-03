"use client";

import {
  ArrowSquareOutIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CaretDownIcon,
  CheckIcon,
  CheckSquareIcon,
  CodeBlockIcon,
  CodeIcon,
  HighlighterCircleIcon,
  LinkIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  PaletteIcon,
  ParagraphIcon,
  QuotesIcon,
  TextAaIcon,
  TextBIcon,
  TextHFiveIcon,
  TextHFourIcon,
  TextHOneIcon,
  TextHSixIcon,
  TextHThreeIcon,
  TextHTwoIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
} from "@phosphor-icons/react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
// The package also ships BackgroundColor, FontFamily, FontSize and LineHeight; only the
// carrier mark and the colour command are registered.
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  type Editor,
  EditorContent,
  type Extensions,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

export type { Editor, Extensions } from "@tiptap/react";
export type { SlashCommand } from "./slash-menu";
import { HIGHLIGHT_PALETTE, TEXT_COLOR_PALETTE } from "../lib/color-palette";
import {
  ALLOWED_LINK_SCHEMES,
  isRichTextJson,
  normalizeHref,
  wrapPlainTextAsDoc,
} from "../lib/rich-text";
import { cn } from "../lib/utils";
import { ColorPicker } from "./color-picker";
import { type SlashCommand, createSlashMenu } from "./slash-menu";
import { TaskItemNode } from "./task-item-node";
import { Tooltip, TooltipProvider } from "./tooltip";

function parseInitial(body: string | null): object | string {
  if (!body) return "";
  if (isRichTextJson(body)) return JSON.parse(body);
  return JSON.parse(wrapPlainTextAsDoc(body));
}

/**
 * Prose styling shared by every editable surface: headings, lists, task-list resets and
 * paragraph spacing. `editorClass` fully replaces the default, so consumers compose this
 * with their own container chrome (background, padding, min-height) rather than restating it.
 */
export const EDITOR_PROSE_CLASS = cn(
  "prose prose-sm max-w-none",
  "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-1 [&_h1]:mt-2",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2",
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1",
  "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mb-1 [&_h4]:mt-1",
  "[&_h5]:text-sm [&_h5]:font-medium [&_h5]:mb-1 [&_h5]:mt-1",
  "[&_h6]:text-xs [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-wide [&_h6]:mb-1 [&_h6]:mt-1",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li]:my-0.5",
  "[&_p]:my-0 [&_p:empty]:min-h-[1.25rem]",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-(--grey-300) [&_blockquote]:pl-2.5 [&_blockquote]:text-(--grey-600)",
  // Colours are set explicitly so code stays legible whatever surface it sits on, and the
  // `before:`/`after:` resets keep the typography plugin's backtick pseudo-elements away
  // should it ever be added.
  "[&_code]:rounded [&_code]:bg-(--surface-200) [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:font-normal [&_code]:text-(--grey-900)",
  "[&_code]:before:content-none [&_code]:after:content-none",
  "[&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:rounded-lg [&_pre]:bg-(--surface-200) [&_pre]:p-3 [&_pre]:text-[0.8125rem] [&_pre]:text-(--grey-900)",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit",
  "[&_hr]:my-3 [&_hr]:border-(--grey-200)",
  "[&_a]:text-(--primary) [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-pointer",
  // Every marker swatch is a `-200` token, so dark text is always the legible choice on top
  // — including on a note whose own colour is darker than the highlight.
  "[&_mark]:rounded-[3px] [&_mark]:px-0.5 [&_mark]:text-(--grey-900)",
  // `Placeholder` marks the empty node holding the cursor with `.is-empty` and a
  // `data-placeholder` attribute. Drawing it as a floated, zero-height pseudo-element keeps
  // it out of the layout — so nothing shifts when the first character lands — and out of the
  // document, so it cannot be selected, dragged or copied. It sits on the real node, which is
  // why it needs no padding offset and follows whatever chrome a consumer composes around it.
  "[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0",
  "[&_.is-empty]:before:text-(--grey-400) [&_.is-empty]:before:content-[attr(data-placeholder)]"
);

const DEFAULT_EDITOR_CLASS = cn("w-full outline-none", EDITOR_PROSE_CLASS);

/**
 * Which parts of the editor an app opts into. The Tier 0 groups are on everywhere; the rest
 * need an extension registered by the hook *and* a control rendered by the toolbar, so both
 * read the same flags. Pass the same object to `useRichTextEditor` and `FormattingToolbar`
 * — the toolbar defaults to whatever the hook was given, so the two cannot drift. Turning a
 * flag on for only one of them is a no-op (no control, or an unused extension), never a
 * control wired to an extension that is not there.
 */
export type EditorFeatures = {
  /** Bold, italic, underline. */
  inlineMarks: boolean;
  /** Heading controls. */
  blockType: boolean;
  /** Bullet, ordered and todo lists. */
  lists: boolean;
  /** Undo and redo. */
  history: boolean;
  highlight: boolean;
  textColor: boolean;
  characterCount: boolean;
  /** Inline formatting floating over the selection. Rendered by `RichTextEditor`, not the toolbar. */
  bubbleMenu: boolean;
  slashMenu: boolean;
};

export const DEFAULT_EDITOR_FEATURES: EditorFeatures = {
  inlineMarks: true,
  blockType: true,
  lists: true,
  history: true,
  highlight: false,
  textColor: false,
  characterCount: false,
  bubbleMenu: false,
  slashMenu: false,
};

/**
 * What the hook was configured with, so a toolbar given no `features` of its own renders
 * exactly the controls its editor can actually drive.
 */
const EDITOR_FEATURES = new WeakMap<Editor, EditorFeatures>();

function resolveFeatures(overrides?: Partial<EditorFeatures>): EditorFeatures {
  return { ...DEFAULT_EDITOR_FEATURES, ...overrides };
}

/**
 * Shown on an empty line, gated on the `slashMenu` flag so no surface hints at a menu it cannot
 * open — Organiser and Exposer stay silent.
 */
const EMPTY_LINE_PLACEHOLDER = "Type / for commands";

/**
 * Nothing written yet, whatever the first line became. `editor.isEmpty` recognises only a
 * single empty paragraph, so promoting that line to a heading or a list — or the trailing
 * paragraph `StarterKit` then appends after it — would otherwise read as a written document
 * and drop the placeholder.
 */
function isBlankDoc(editor: Editor): boolean {
  const { doc } = editor.state;
  if (doc.textContent !== "") return false;
  // A leaf node is content without text: a divider, an image, Noter's reminder block.
  let hasLeaf = false;
  doc.descendants((node) => {
    if (node.isLeaf && !node.isText) hasLeaf = true;
    return !hasLeaf;
  });
  return !hasLeaf;
}

export type UseRichTextEditorOptions = {
  content: string | null;
  onChange: (json: string) => void;
  /** App-specific nodes/marks injected alongside the generic base extensions. */
  extensions?: Extensions;
  /** Overrides the class applied to the editable surface. */
  editorClass?: string;
  /** Shown while the document is still blank. */
  placeholder?: string;
  /** App-specific `/` commands, appended to the shared block types. Needs the `slashMenu` flag. */
  slashCommands?: SlashCommand[];
  /** Opt-in features; the Tier 0 groups are on by default. */
  features?: Partial<EditorFeatures>;
};

export function useRichTextEditor({
  content,
  onChange,
  extensions,
  editorClass,
  placeholder,
  slashCommands,
  features,
}: UseRichTextEditorOptions): Editor | null {
  const resolved = resolveFeatures(features);
  // `Placeholder` resolves its text on every transaction, long after this render's closure
  // went stale, so the copy and the flag it depends on are read through a ref.
  const placeholderRef = useRef({ text: placeholder, slashMenu: resolved.slashMenu });
  placeholderRef.current = { text: placeholder, slashMenu: resolved.slashMenu };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: {
          // Clicking a link opens the edit popover instead of navigating mid-edit.
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          protocols: ALLOWED_LINK_SCHEMES,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      TaskList,
      TaskItem.extend({
        addNodeView() {
          return ReactNodeViewRenderer(TaskItemNode);
        },
      }).configure({ nested: false }),
      // Smart punctuation everywhere — there is no surface that wants typewriter quotes. The
      // rules never fire inside an inline `code` mark or a code block: TipTap's input-rule
      // runner bails on a parent node or neighbouring mark whose spec sets `code: true`,
      // which covers both. Backspace undoes a substitution on its own, ahead of any other
      // Backspace handling, so an unwanted one costs a single keystroke to back out of.
      Typography.configure({
        // Disabled by name rather than left on by default: each fires on punctuation that
        // turns up in ordinary notes. `(c)`, `(r)` and `(sm)` are how a hand-written list
        // labels its items, and `<<`/`>>` are how one points at the next step.
        copyright: false,
        registeredTrademark: false,
        servicemark: false,
        laquo: false,
        raquo: false,
        // `!=` is code being talked about rather than run, which the code-mark exclusion
        // cannot see — and `≠` is not what anyone meant to copy back out of the note.
        notEqual: false,
      }),
      Placeholder.configure({
        placeholder: ({ editor: e, node }) => {
          const { text, slashMenu } = placeholderRef.current;
          // Only a textblock renders text of its own; an empty list or blockquote wrapper is
          // decorated too, and would otherwise repeat the placeholder around its own child.
          if (!node.isTextblock) return "";
          if (isBlankDoc(e)) return text ?? "";
          // A code block takes punctuation literally, hints included.
          if (!slashMenu || node.type.name !== "paragraph") return "";
          return EMPTY_LINE_PLACEHOLDER;
        },
      }),
      // Opt-in extensions are registered from the same flags the toolbar reads, so a control
      // can never appear without the extension behind it.
      ...(resolved.highlight ? [Highlight.configure({ multicolor: true })] : []),
      // `Color` writes into the `textStyle` mark, so the carrier comes with it.
      ...(resolved.textColor ? [TextStyle, Color] : []),
      // No `limit`: the count informs, it does not enforce.
      ...(resolved.characterCount ? [CharacterCount] : []),
      ...(resolved.slashMenu
        ? [createSlashMenu([...DEFAULT_SLASH_COMMANDS, ...(slashCommands ?? [])])]
        : []),
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

  if (editor) EDITOR_FEATURES.set(editor, resolved);
  return editor;
}

/**
 * Keyboard shortcuts are written as TipTap writes them ("Mod-Shift-S") and rendered with the
 * symbols of whichever platform is reading, so the tooltip matches the key the user presses.
 */
function formatShortcut(spec: string): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const symbols: Record<string, string> = isMac
    ? { Mod: "\u2318", Shift: "\u21e7", Alt: "\u2325" }
    : { Mod: "Ctrl", Shift: "Shift", Alt: "Alt" };
  const parts = spec.split("-").map((part) => symbols[part] ?? part);
  return isMac ? parts.join("") : parts.join("+");
}

type ToolbarButtonProps = {
  /** Omitted for buttons that insert rather than toggle, which have no pressed state. */
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  /** The button's label: its accessible name, and the first line of its tooltip. */
  title: string;
  /** A TipTap-style shortcut spec, e.g. "Mod-Shift-S". */
  shortcut?: string;
  disabled?: boolean;
};

export function ToolbarButton({
  active,
  onClick,
  children,
  title,
  shortcut,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip content={shortcut ? `${title} ${formatShortcut(shortcut)}` : title}>
      <button
        type="button"
        aria-label={title}
        aria-pressed={active ?? undefined}
        disabled={disabled}
        onMouseDown={(e) => {
          // Keeps focus (and the selection) in the editor, which also stops a click inside
          // Noter's ActionModal from reaching the modal's dismiss handling.
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
    </Tooltip>
  );
}

type CharacterCountProps = {
  editor: Editor | null;
  className?: string;
};

/**
 * Words and characters for the current document. Renders nothing unless the editor was built
 * with the `characterCount` flag, so a surface can place it unconditionally and let the hook's
 * features decide — the same way the toolbar resolves its groups.
 */
export function EditorCharacterCount({ editor, className }: CharacterCountProps) {
  if (!editor) return null;
  const features = EDITOR_FEATURES.get(editor) ?? DEFAULT_EDITOR_FEATURES;
  if (!features.characterCount) return null;
  return <CharacterCountText editor={editor} {...(className !== undefined && { className })} />;
}

function CharacterCountText({ editor, className }: CharacterCountProps & { editor: Editor }) {
  // Read off editor state rather than the note state the consumer debounces, so typing updates
  // the count here without touching the save timer, and only this span re-renders.
  const { words, characters } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      words: e?.storage.characterCount.words() ?? 0,
      characters: e?.storage.characterCount.characters() ?? 0,
    }),
  });

  return (
    <span className={cn("shrink-0 text-xs text-(--grey-400) tabular-nums", className)}>
      {words} {words === 1 ? "word" : "words"} · {characters}{" "}
      {characters === 1 ? "character" : "characters"}
    </span>
  );
}

type RichTextEditorProps = {
  editor: Editor | null;
  className?: string;
  containerClassName?: string;
};

/**
 * The scrolling ancestor the editor actually sits in — Noter's full-page editor scrolls a div,
 * not the window, and the bubble menu only learns about scrolling from the target it is given.
 */
function nearestScrollParent(el: HTMLElement): HTMLElement | Window {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return window;
}

/**
 * Inline formatting over the selection, so a phone does not have to travel to the toolbar and
 * lose sight of what is selected. The persistent toolbar stays and keeps the block-level
 * actions; this carries the marks only.
 */
function SelectionBubble({
  editor,
  container,
  features,
}: {
  editor: Editor;
  container: React.RefObject<HTMLDivElement | null>;
  features: EditorFeatures;
}) {
  // Resolved after mount because it is a layout question; until then there is nothing to attach
  // to, and mounting with the window as a fallback would miss an inner scroll container.
  const [scrollTarget, setScrollTarget] = useState<HTMLElement | Window | null>(null);
  useEffect(() => {
    setScrollTarget(nearestScrollParent(editor.view.dom));
  }, [editor]);

  if (!scrollTarget) return null;
  const showColors = features.highlight || features.textColor;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: e, state, from, to }) => {
        // A node selection — Noter's reminder block — carries a `node`; no inline mark applies
        // to it. Duck-typed rather than importing ProseMirror's selection classes directly.
        if ("node" in state.selection) return false;
        // A code block is literal text; marking it up would change what it says.
        if (e.isActive("codeBlock")) return false;
        // An empty or whitespace-only range has nothing to format.
        return state.doc.textBetween(from, to, " ").trim().length > 0;
      }}
      // Appended inside the editor's own container so losing focus to anything outside it still
      // dismisses the bubble, while `fixed` keeps it clear of that container's overflow.
      appendTo={() => container.current ?? document.body}
      options={{
        strategy: "fixed",
        placement: "top",
        offset: 8,
        // Flip below rather than clip when the selection is near the top of the viewport, and
        // shift along the edge rather than overflow it at narrow widths.
        flip: true,
        shift: { padding: 8 },
        // Hides itself once the selection scrolls out of view, instead of floating detached.
        hide: true,
        scrollTarget,
      }}
      className="z-[9050]"
    >
      <TooltipProvider>
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-[12px] bg-(--card) p-1",
            "shadow-[0_12px_24px_0_rgba(0,0,0,0.22)]"
          )}
        >
          <InlineMarkButtons editor={editor} />
          {showColors && <div className="mx-0.5 h-4 w-px bg-(--grey-200)" />}
          {features.highlight && <HighlightButton editor={editor} />}
          {features.textColor && <TextColorButton editor={editor} />}
        </div>
      </TooltipProvider>
    </BubbleMenu>
  );
}

/** The placeholder belongs to `useRichTextEditor` — the extension renders it on the node. */
export function RichTextEditor({ editor, className, containerClassName }: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const features = editor ? (EDITOR_FEATURES.get(editor) ?? DEFAULT_EDITOR_FEATURES) : null;

  return (
    <div ref={containerRef} className={containerClassName}>
      <EditorContent editor={editor} className={className} />
      {editor && features?.bubbleMenu && (
        <SelectionBubble editor={editor} container={containerRef} features={features} />
      )}
    </div>
  );
}

/**
 * The inline marks, as one unit: the persistent toolbar's first group and the whole of the
 * selection bubble render the same buttons, so neither can drift from the other. It selects its
 * own active states, which keeps them out of the toolbar's selector and scoped to this subtree.
 */
function InlineMarkButtons({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
    }),
  });

  return (
    <>
      <ToolbarButton
        active={s.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
        shortcut="Mod-B"
      >
        <TextBIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        active={s.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
        shortcut="Mod-I"
      >
        <TextItalicIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        active={s.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
        shortcut="Mod-U"
      >
        <TextUnderlineIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        active={s.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        shortcut="Mod-Shift-S"
      >
        <TextStrikethroughIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        active={s.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
        shortcut="Mod-E"
      >
        <CodeIcon size={14} />
      </ToolbarButton>
      <LinkButton editor={editor} />
    </>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isOnLink, currentHref } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isOnLink: e?.isActive("link") ?? false,
      currentHref: (e?.getAttributes("link").href as string | undefined) ?? "",
    }),
  });

  const openPopover = useCallback(() => {
    setValue((editor.getAttributes("link").href as string | undefined) ?? "");
    setError(null);
    setOpen(true);
  }, [editor]);

  // Mod-K, and clicking a link, both open this popover. `openOnClick: false` already stops
  // the click from navigating; this gives it somewhere to go instead.
  useEffect(() => {
    const dom = editor.view.dom;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPopover();
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("a")) {
        e.preventDefault();
        openPopover();
      }
    };
    dom.addEventListener("keydown", onKeyDown);
    dom.addEventListener("click", onClick);
    return () => {
      dom.removeEventListener("keydown", onKeyDown);
      dom.removeEventListener("click", onClick);
    };
  }, [editor, openPopover]);

  const apply = () => {
    const href = normalizeHref(value);
    if (!href) {
      setError("Enter a web or email address (http, https or mailto).");
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !isOnLink) {
      // Nothing selected and not on a link: the URL becomes its own link text.
      chain
        .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
        .run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    setOpen(false);
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? openPopover() : setOpen(false))}
    >
      <Tooltip content={`Link ${formatShortcut("Mod-K")}`}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Link"
            aria-pressed={isOnLink}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              isOnLink || open
                ? "bg-(--surface-300) text-(--grey-900)"
                : "text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            )}
          >
            <LinkIcon size={14} />
          </button>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          className={cn(
            "z-[9100] flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-[16px] bg-(--card) p-3 outline-none",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <input
            ref={inputRef}
            type="url"
            inputMode="url"
            value={value}
            placeholder="https://example.com"
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            className={cn(
              "h-9 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm text-(--grey-900) outline-none",
              "placeholder:text-(--grey-400)",
              error && "ring-1 ring-(--red-400)"
            )}
          />
          {error && <p className="text-xs text-(--red-600)">{error}</p>}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-(--primary) px-2.5 py-1.5 text-xs font-medium text-(--primary-foreground)"
            >
              {isOnLink ? "Update" : "Add link"}
            </button>
            {isOnLink && (
              <>
                <button
                  type="button"
                  onClick={remove}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-(--grey-700) hover:bg-(--surface-150)"
                >
                  Remove
                </button>
                <a
                  href={currentHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in a new tab"
                  aria-label="Open in a new tab"
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded text-(--grey-500) hover:bg-(--surface-150) hover:text-(--grey-900)"
                >
                  <ArrowSquareOutIcon size={14} />
                </a>
              </>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * A marker for the selection, drawn from the shared palette's `-200` level. The swatch row is
 * the same `ColorPicker` the apps use for note and folder colours, so a highlight is picked the
 * way every other colour in the fleet is.
 */
function HighlightButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const activeColor = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.isActive("highlight")
        ? (e.getAttributes("highlight").color as string | undefined)
        : null) ?? null,
  });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip content="Highlight">
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Highlight"
            aria-pressed={activeColor !== null}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              activeColor !== null || open
                ? "bg-(--surface-300) text-(--grey-900)"
                : "text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            )}
          >
            <HighlighterCircleIcon size={14} />
          </button>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          // Focus stays in the document, so applying a swatch keeps the selection it applies to.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "z-[9100] flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-[16px] bg-(--card) p-3 outline-none",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <ColorPicker
            palette={HIGHLIGHT_PALETTE}
            value={activeColor}
            onChange={(color) => {
              editor.chain().focus().setHighlight({ color }).run();
              setOpen(false);
            }}
          />
          <button
            type="button"
            disabled={activeColor === null}
            onClick={() => {
              editor.chain().focus().unsetHighlight().run();
              setOpen(false);
            }}
            className={cn(
              "self-start rounded-lg px-2.5 py-1.5 text-xs text-(--grey-700) hover:bg-(--surface-150)",
              activeColor === null && "pointer-events-none opacity-40"
            )}
          >
            Remove highlight
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * Body-text colour for the selection, from the palette's dark `-700` level. Unsetting clears
 * the `textStyle` carrier as well as the colour, so an abandoned colour leaves no empty span
 * behind in the stored JSON.
 */
function TextColorButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const activeColor = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.isActive("textStyle")
        ? (e.getAttributes("textStyle").color as string | undefined)
        : null) ?? null,
  });

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip content="Text colour">
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label="Text colour"
            aria-pressed={activeColor !== null}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded transition-colors",
              activeColor !== null || open
                ? "bg-(--surface-300) text-(--grey-900)"
                : "text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            )}
          >
            <PaletteIcon size={14} {...(activeColor && { style: { color: activeColor } })} />
          </button>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "z-[9100] flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-[16px] bg-(--card) p-3 outline-none",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          <ColorPicker
            palette={TEXT_COLOR_PALETTE}
            value={activeColor}
            onChange={(color) => {
              editor.chain().focus().setColor(color).run();
              setOpen(false);
            }}
          />
          <button
            type="button"
            disabled={activeColor === null}
            onClick={() => {
              editor.chain().focus().unsetColor().removeEmptyTextStyle().run();
              setOpen(false);
            }}
            className={cn(
              "self-start rounded-lg px-2.5 py-1.5 text-xs text-(--grey-700) hover:bg-(--surface-150)",
              activeColor === null && "pointer-events-none opacity-40"
            )}
          >
            Default colour
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

type BlockType = {
  value: string;
  label: string;
  icon: typeof ParagraphIcon;
  isActive: (editor: Editor) => boolean;
  apply: (chain: ReturnType<Editor["chain"]>) => void;
};

const BLOCK_TYPES: BlockType[] = [
  {
    value: "paragraph",
    label: "Paragraph",
    icon: ParagraphIcon,
    isActive: (e) => e.isActive("paragraph"),
    apply: (c) => c.setParagraph().run(),
  },
  ...([1, 2, 3, 4, 5, 6] as const).map((level) => ({
    value: `heading${level}`,
    label: `Heading ${level}`,
    icon: [TextHOneIcon, TextHTwoIcon, TextHThreeIcon, TextHFourIcon, TextHFiveIcon, TextHSixIcon][
      level - 1
    ] as typeof ParagraphIcon,
    isActive: (e: Editor) => e.isActive("heading", { level }),
    apply: (c: ReturnType<Editor["chain"]>) => c.toggleHeading({ level }).run(),
  })),
  {
    value: "blockquote",
    label: "Quote",
    icon: QuotesIcon,
    isActive: (e) => e.isActive("blockquote"),
    apply: (c) => c.toggleBlockquote().run(),
  },
  {
    value: "codeBlock",
    label: "Code block",
    icon: CodeBlockIcon,
    isActive: (e) => e.isActive("codeBlock"),
    apply: (c) => c.toggleCodeBlock().run(),
  },
];

/**
 * The shared `/` menu entries. Headings reuse `BLOCK_TYPES` outright — same label, same icon,
 * same command as the block picker — and the rest mirror their toolbar buttons, so the two
 * surfaces cannot drift into describing the same action two different ways.
 */
const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  ...BLOCK_TYPES.filter((b) => /^heading[123]$/.test(b.value)).map((b) => ({
    title: b.label,
    keywords: [`h${b.value.slice(-1)}`, "heading", "title"],
    icon: b.icon,
    run: (e: Editor) => b.apply(e.chain().focus()),
  })),
  {
    title: "Bullet list",
    keywords: ["unordered", "ul", "list"],
    icon: ListBulletsIcon,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Ordered list",
    keywords: ["numbered", "ol", "list"],
    icon: ListNumbersIcon,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Todo list",
    keywords: ["task", "checkbox", "checklist"],
    icon: CheckSquareIcon,
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Quote",
    keywords: ["blockquote", "citation"],
    icon: QuotesIcon,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code block",
    keywords: ["pre", "snippet", "fence"],
    icon: CodeBlockIcon,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    keywords: ["hr", "rule", "separator", "line"],
    icon: MinusIcon,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

/**
 * The block at the cursor, or null when a selection spans blocks of different types —
 * `isActive` is only true when the whole range sits in that node, so a mixed range matches
 * nothing and the trigger shows a neutral state rather than naming one of them.
 */
function activeBlockType(editor: Editor): BlockType | null {
  const match = BLOCK_TYPES.find((b) => b.isActive(editor));
  if (match) return match;
  return editor.state.selection.empty ? (BLOCK_TYPES[0] ?? null) : null;
}

function BlockTypePicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const activeValue = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? (activeBlockType(e)?.value ?? null) : null),
  });
  const active = BLOCK_TYPES.find((b) => b.value === activeValue) ?? null;
  const TriggerIcon = active?.icon ?? TextAaIcon;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={active ? `Block type: ${active.label}` : "Block type"}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={`Block type${active ? `: ${active.label}` : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "flex h-7 items-center gap-0.5 rounded px-1 transition-colors",
              "text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)",
              open && "bg-(--surface-300) text-(--grey-900)"
            )}
          >
            <TriggerIcon size={14} />
            <CaretDownIcon size={10} />
          </button>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className={cn(
            "z-[9100] flex w-48 flex-col gap-0.5 rounded-[16px] bg-(--card) p-2 outline-none",
            "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
            "animate-[overlay-in_0.3s_ease-in-out]"
          )}
        >
          {BLOCK_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = active?.value === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  // Picking the current block would toggle it back off, so only apply a change.
                  if (!isActive) type.apply(editor.chain().focus());
                  else editor.chain().focus().run();
                  setOpen(false);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                  "text-sm text-(--grey-900) outline-none hover:bg-(--surface-150)",
                  isActive && "font-medium"
                )}
              >
                <Icon size={16} className="shrink-0" />
                {type.label}
                {isActive && <CheckIcon size={14} className="ml-auto" />}
              </button>
            );
          })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

type FormattingToolbarProps = {
  editor: Editor | null;
  /**
   * Which groups render. Defaults to whatever `useRichTextEditor` was given for this editor,
   * so it only needs passing to render a narrower toolbar over the same editor.
   */
  features?: Partial<EditorFeatures>;
  /** App-specific trailing buttons (e.g. Noter's reminder), shown after a divider. */
  children?: ReactNode;
};

export function FormattingToolbar({ editor, features, children }: FormattingToolbarProps) {
  if (!editor) return null;
  return (
    <ToolbarContent editor={editor} {...(features !== undefined && { features })}>
      {children}
    </ToolbarContent>
  );
}

function ToolbarContent({
  editor,
  features,
  children,
}: FormattingToolbarProps & { editor: Editor }) {
  const f = features
    ? resolveFeatures(features)
    : (EDITOR_FEATURES.get(editor) ?? DEFAULT_EDITOR_FEATURES);

  // `useEditor` does not re-render on transactions in v3, so every active and disabled state
  // below is selected here instead — without this the toolbar shows whatever was true when
  // its parent last rendered.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  // Groups render in order with a divider between them; an empty group takes no divider, so
  // later tickets can fill one in without leaving a stray rule behind.
  const groups: { key: string; buttons: ReactNode }[] = [];

  if (f.inlineMarks) {
    groups.push({ key: "inline", buttons: <InlineMarkButtons editor={editor} /> });
  }

  if (f.blockType) {
    groups.push({
      key: "block",
      buttons: (
        <>
          <BlockTypePicker editor={editor} />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <MinusIcon size={14} />
          </ToolbarButton>
        </>
      ),
    });
  }

  if (f.highlight || f.textColor) {
    groups.push({
      key: "colors",
      buttons: (
        <>
          {f.highlight && <HighlightButton editor={editor} />}
          {f.textColor && <TextColorButton editor={editor} />}
        </>
      ),
    });
  }

  if (f.lists) {
    groups.push({
      key: "lists",
      buttons: (
        <>
          <ToolbarButton
            active={s.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
            shortcut="Mod-Shift-8"
          >
            <ListBulletsIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={s.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered list"
            shortcut="Mod-Shift-7"
          >
            <ListNumbersIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={s.taskList}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Todo list"
            shortcut="Mod-Shift-9"
          >
            <CheckSquareIcon size={14} />
          </ToolbarButton>
        </>
      ),
    });
  }

  if (f.history) {
    groups.push({
      key: "history",
      buttons: (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
            shortcut="Mod-Z"
            disabled={!s.canUndo}
          >
            <ArrowUUpLeftIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
            shortcut="Mod-Shift-Z"
            disabled={!s.canRedo}
          >
            <ArrowUUpRightIcon size={14} />
          </ToolbarButton>
        </>
      ),
    });
  }

  if (children) groups.push({ key: "app", buttons: children });

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-0.5 border-t border-(--grey-200) pt-2">
        {groups.map((group, i) => (
          <Fragment key={group.key}>
            {i > 0 && <div className="mx-1 h-4 w-px bg-(--grey-200)" />}
            {group.buttons}
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  );
}

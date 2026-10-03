"use client";

import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { type Editor, Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import type { ComponentType } from "react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { cn } from "../lib/utils";

/**
 * One entry in the `/` menu. Apps contribute their own alongside the shared block types, the
 * way they already pass `extensions` — Noter's `/reminder` is one of these.
 */
export type SlashCommand = {
  /** Shown in the list, and matched against the typed query. */
  title: string;
  /** Further terms that should match, so `/todo` finds "Task list" and `/hr` finds "Divider". */
  keywords?: string[];
  /** The icon its toolbar counterpart uses, so both surfaces read as one vocabulary. */
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Runs with the typed `/query` already removed and focus back in the document. */
  run: (editor: Editor) => void;
};

function matches(command: SlashCommand, query: string): boolean {
  const q = query.toLowerCase();
  if (command.title.toLowerCase().includes(q)) return true;
  return (command.keywords ?? []).some((k) => k.toLowerCase().includes(q));
}

type ListProps = SuggestionProps<SlashCommand, SlashCommand>;

/** What the suggestion plugin's `onKeyDown` drives from outside React. */
type ListHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

const SlashList = forwardRef<ListHandle, ListProps>(({ items, command, query }, ref) => {
  const [selected, setSelected] = useState(0);
  const [lastQuery, setLastQuery] = useState(query);

  // A new query is a new list, so a carried-over index would point at a different command.
  // Adjusted during render rather than in an effect: the highlight is never a frame behind, and
  // the imperative handle the plugin holds stays the same object.
  if (query !== lastQuery) {
    setLastQuery(query);
    setSelected(0);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelected((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      // Escape is the plugin's own: it dismisses and leaves the typed text in place.
      return false;
    },
  }));

  return (
    <div
      className={cn(
        "flex max-h-[18rem] w-56 max-w-[calc(100vw-2rem)] flex-col gap-0.5 overflow-y-auto",
        "rounded-[16px] bg-(--card) p-2 outline-none",
        "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]"
      )}
    >
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-(--grey-500)">No matching command</p>
      ) : (
        items.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              // The menu is driven from the document, which keeps focus; taking it here would
              // close the menu before the command could run.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelected(i)}
              onClick={() => command(item)}
              className={cn(
                // `min-h-9` keeps every row a comfortable tap target on a phone.
                "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                "text-sm text-(--grey-900) outline-none",
                i === selected && "bg-(--surface-150)"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {item.title}
            </button>
          );
        })
      )}
    </div>
  );
});
SlashList.displayName = "SlashList";

/**
 * Positions the list against the typed `/`, appended to the body so neither the modal's nor the
 * editor's `overflow` can clip it. `autoUpdate` with the editor as the virtual reference's
 * context element is what keeps it attached while an inner container scrolls.
 */
function positionList(element: HTMLElement, props: ListProps): () => void {
  const reference = {
    getBoundingClientRect: () => props.clientRect?.() ?? new DOMRect(),
    contextElement: props.editor.view.dom,
  };

  element.style.position = "fixed";
  element.style.top = "0";
  element.style.left = "0";
  // On the positioned wrapper, not the list inside it: `position: fixed` makes this element its
  // own stacking context, so a z-index on its child would be trapped under the modal's layer.
  element.style.zIndex = "9100";

  return autoUpdate(reference, element, () => {
    computePosition(reference, element, {
      strategy: "fixed",
      placement: "bottom-start",
      middleware: [offset(6), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    });
  });
}

/**
 * The `/` command menu. `allowedPrefixes` defaults to `[" "]`, so the trigger only fires at the
 * start of a text block or after a space — a slash typed mid-word stays a literal slash.
 */
export function createSlashMenu(commands: SlashCommand[]): Extension {
  return Extension.create({
    name: "slashMenu",

    addProseMirrorPlugins() {
      return [
        Suggestion<SlashCommand, SlashCommand>({
          editor: this.editor,
          char: "/",
          command: ({ editor, range, props }) => {
            // Clear the typed `/query` first so the command acts on a clean block, and so an
            // insertion does not land after leftover text.
            editor.chain().focus().deleteRange(range).run();
            props.run(editor);
          },
          items: ({ query }) => commands.filter((c) => matches(c, query)),
          render: () => {
            let renderer: ReactRenderer<ListHandle, ListProps> | null = null;
            let stopPositioning: (() => void) | null = null;

            return {
              onStart: (props) => {
                renderer = new ReactRenderer(SlashList, { props, editor: props.editor });
                document.body.appendChild(renderer.element);
                stopPositioning = positionList(renderer.element, props);
              },
              onUpdate: (props) => {
                renderer?.updateProps(props);
              },
              onKeyDown: ({ event }) => renderer?.ref?.onKeyDown(event) ?? false,
              onExit: () => {
                stopPositioning?.();
                stopPositioning = null;
                renderer?.element.remove();
                renderer?.destroy();
                renderer = null;
              },
            };
          },
        }),
      ];
    },
  });
}

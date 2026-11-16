// Tiny builders for the rich-text JSON (TipTap/ProseMirror) that Noter and Organiser store as text.

type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string };

export const text = (value: string): Node => ({ type: "text", text: value });
export const paragraph = (value = ""): Node => ({
  type: "paragraph",
  content: value ? [text(value)] : [],
});
export const heading = (level: 1 | 2 | 3, value: string): Node => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});
export const bullets = (items: string[]): Node => ({
  type: "bulletList",
  content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
});
/** A checklist: `[label, checked]` pairs. */
export const tasks = (items: [string, boolean][]): Node => ({
  type: "taskList",
  content: items.map(([label, checked]) => ({
    type: "taskItem",
    attrs: { checked },
    content: [paragraph(label)],
  })),
});

/** The document as Noter and Organiser store it: a JSON string. */
export function doc(...content: Node[]): string {
  return JSON.stringify({ type: "doc", content });
}

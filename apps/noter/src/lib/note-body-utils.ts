type ProseMirrorNode = {
  type: string;
  text?: string;
  content?: ProseMirrorNode[];
};

export function isRichTextJson(body: string | null): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body);
    return parsed?.type === "doc";
  } catch {
    return false;
  }
}

export function wrapPlainTextAsDoc(text: string): string {
  const paragraphs = text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : [],
  }));
  return JSON.stringify({ type: "doc", content: paragraphs });
}

function collectText(node: ProseMirrorNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(collectText).join(node.type === "paragraph" ? "\n" : "");
}

export function extractPlainText(body: string | null, maxLen = 150): string {
  if (!body) return "";
  if (!isRichTextJson(body)) return body.slice(0, maxLen);
  try {
    const doc: ProseMirrorNode = JSON.parse(body);
    const text = collectText(doc).trim();
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}…`;
  } catch {
    return body.slice(0, maxLen);
  }
}

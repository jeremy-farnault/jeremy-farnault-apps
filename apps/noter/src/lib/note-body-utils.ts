type ProseMirrorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderNodeToHtml(node: ProseMirrorNode): string {
  if (node.type === "text") {
    let html = escapeHtml(node.text ?? "");
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        else if (mark.type === "italic") html = `<em>${html}</em>`;
        else if (mark.type === "underline") html = `<u>${html}</u>`;
        else if (mark.type === "code") html = `<code>${html}</code>`;
      }
    }
    return html;
  }

  const inner = (node.content ?? []).map(renderNodeToHtml).join("");

  switch (node.type) {
    case "doc":
      return inner;
    case "paragraph":
      return `<p>${inner}</p>`;
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `<h${level}>${inner}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${inner}</ul>`;
    case "orderedList":
      return `<ol>${inner}</ol>`;
    case "listItem":
      return `<li>${inner}</li>`;
    case "taskList":
      return `<ul class="task-list">${inner}</ul>`;
    case "taskItem": {
      const checked = node.attrs?.checked === true;
      return `<li class="task-item"><input type="checkbox" disabled${checked ? " checked" : ""}> ${inner}</li>`;
    }
    case "blockquote":
      return `<blockquote>${inner}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${inner}</code></pre>`;
    case "hardBreak":
      return "<br>";
    default:
      return inner;
  }
}

export function renderToHtml(body: string | null): string {
  if (!body) return "";
  if (!isRichTextJson(body)) return `<p>${escapeHtml(body)}</p>`;
  try {
    const doc: ProseMirrorNode = JSON.parse(body);
    return renderNodeToHtml(doc);
  } catch {
    return `<p>${escapeHtml(body)}</p>`;
  }
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

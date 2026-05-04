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
      const checkSvg = checked
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="m9.907 15.162 9.589-8.717 1.009 1.11-9.59 8.717a2.75 2.75 0 0 1-3.794-.09L3.47 12.53l1.06-1.06 3.652 3.651a1.25 1.25 0 0 0 1.725.041" clip-rule="evenodd"/></svg>`
        : "";
      const chkClass = `task-checkbox${checked ? " task-checkbox--checked" : ""}`;
      const labelClass = `task-item-label${checked ? " task-item-label--checked" : ""}`;
      return `<li class="task-item"><span class="${chkClass}">${checkSvg}</span><div class="${labelClass}">${inner}</div></li>`;
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

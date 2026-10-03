// Dependency-free helpers for rich-text content stored as TipTap/ProseMirror JSON.
// No live editor and no @tiptap/* imports, so this module is safe to use on servers and
// unauthenticated pages (pair renderToHtml with an HTML sanitizer at the call site).

type ProseMirrorMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

type ProseMirrorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProseMirrorMark[];
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
  // Block-level children join on a newline so headings, list items and task items do not
  // run together in previews or in Organiser's search haystack.
  return node.content.map(collectText).join("\n");
}

/** Schemes a link may carry, in the editor and on public pages alike. */
export const ALLOWED_LINK_SCHEMES = ["http", "https", "mailto"];

/**
 * Resolve an href to an absolute URL on an allowed scheme, or null when it cannot be. A
 * protocol-relative (`//host`) or host-shaped scheme-less (`host.com/x`) href is normalised
 * to https; a genuinely relative path (`/gallery/1`) and every other scheme are rejected,
 * so callers can treat null as "not a usable link" rather than emitting it as-is.
 */
export function normalizeHref(raw: string | null | undefined): string | null {
  const href = raw?.trim();
  if (!href) return null;

  let candidate: string;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) candidate = href;
  else if (href.startsWith("//")) candidate = `https:${href}`;
  // A scheme-less href is only a host if it looks like one — `/gallery/1` does not.
  else if (/^[^/\s?#]+\.[^/\s?#]+/.test(href)) candidate = `https://${href}`;
  else return null;

  try {
    const url = new URL(candidate);
    const scheme = url.protocol.slice(0, -1).toLowerCase();
    return ALLOWED_LINK_SCHEMES.includes(scheme) ? url.toString() : null;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Attribute values additionally escape quotes, which are harmless in text content. */
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Colour marks only ever carry a resolved palette token (`var(--green-400)`), matching how
 * note and arc colours are stored. Anything else is dropped rather than interpolated into a
 * style attribute.
 */
const PALETTE_COLOR = /^var\(--[a-z0-9-]+\)$/;

function paletteColor(value: unknown): string | null {
  return typeof value === "string" && PALETTE_COLOR.test(value) ? value : null;
}

// Marks nest outward in array order: the first mark is innermost.
function applyMark(html: string, mark: ProseMirrorMark): string {
  switch (mark.type) {
    case "bold":
      return `<strong>${html}</strong>`;
    case "italic":
      return `<em>${html}</em>`;
    case "underline":
      return `<u>${html}</u>`;
    case "strike":
      return `<s>${html}</s>`;
    case "code":
      return `<code>${html}</code>`;
    case "link": {
      const href = mark.attrs?.href;
      if (typeof href !== "string" || !href) return html;
      return `<a href="${escapeAttr(href)}">${html}</a>`;
    }
    case "highlight": {
      const color = paletteColor(mark.attrs?.color);
      if (!color) return `<mark>${html}</mark>`;
      return `<mark data-color="${escapeAttr(color)}" style="background-color: ${color}">${html}</mark>`;
    }
    case "textStyle": {
      // An unset colour leaves no empty <span> behind.
      const color = paletteColor(mark.attrs?.color);
      return color ? `<span style="color: ${color}">${html}</span>` : html;
    }
    default:
      return html;
  }
}

function renderNodeToHtml(node: ProseMirrorNode): string {
  if (node.type === "text") {
    let html = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      html = applyMark(html, mark);
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
    case "horizontalRule":
      return "<hr>";
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

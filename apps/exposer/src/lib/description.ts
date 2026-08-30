import "server-only";

import { extractPlainText, renderToHtml } from "@jf/ui/rich-text";
import sanitizeHtml from "sanitize-html";

// Allowlist matches exactly the tags/classes `renderToHtml` can emit. `svg`/`path` are
// intentionally omitted — sanitize-html lowercases attributes, which would break SVG's
// case-sensitive `viewBox`; task checkboxes still render as filled/empty squares via CSS.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "span",
    "div",
  ],
  allowedAttributes: { "*": ["class"] },
  allowedSchemes: [],
  disallowedTagsMode: "discard",
};

/**
 * Render a stored description (TipTap JSON) to sanitized HTML for the public feed.
 * Returns null for empty/whitespace-only content so nothing renders (no empty artifacts).
 */
export function renderDescriptionHtml(json: string | null): string | null {
  if (!json) return null;
  if (extractPlainText(json).trim() === "") return null;
  return sanitizeHtml(renderToHtml(json), SANITIZE_OPTIONS);
}

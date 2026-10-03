import "server-only";

import {
  ALLOWED_LINK_SCHEMES,
  extractPlainText,
  normalizeHref,
  renderToHtml,
} from "@jf/ui/rich-text";
import sanitizeHtml from "sanitize-html";

// Allowlist matches exactly the tags/classes `renderToHtml` can emit. `svg`/`path` are
// intentionally omitted — sanitize-html lowercases attributes, which would break SVG's
// case-sensitive `viewBox`; task checkboxes still render as filled/empty squares via CSS.
// `style` is deliberately absent too: highlight and text colour ride on an inline style, so
// publicly they fall back to a shared marker tone and the default text colour.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
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
    "hr",
    "mark",
    "a",
    "span",
    "div",
  ],
  allowedAttributes: { "*": ["class"], a: ["href", "rel", "target"] },
  allowedSchemes: ALLOWED_LINK_SCHEMES,
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    // `rel` and `target` are forced here rather than trusted from the stored JSON, and an
    // unusable href drops the anchor while keeping its text.
    a: (_tagName, attribs) => {
      const href = normalizeHref(attribs.href);
      if (!href) return { tagName: "span", attribs: {} };
      return {
        tagName: "a",
        attribs: { href, rel: "nofollow noopener noreferrer", target: "_blank" },
      };
    },
  },
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

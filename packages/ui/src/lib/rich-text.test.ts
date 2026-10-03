import { describe, expect, it } from "vitest";
import {
  extractPlainText,
  isRichTextJson,
  normalizeHref,
  renderToHtml,
  wrapPlainTextAsDoc,
} from "./rich-text";

/** Wraps inline content in the minimal doc/paragraph shell the editor always produces. */
const doc = (...content: unknown[]) => JSON.stringify({ type: "doc", content });
const para = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (value: string, ...marks: unknown[]) =>
  marks.length ? { type: "text", text: value, marks } : { type: "text", text: value };

describe("renderToHtml — marks", () => {
  it("renders the four original marks", () => {
    expect(renderToHtml(doc(para(text("a", { type: "bold" }))))).toBe("<p><strong>a</strong></p>");
    expect(renderToHtml(doc(para(text("a", { type: "italic" }))))).toBe("<p><em>a</em></p>");
    expect(renderToHtml(doc(para(text("a", { type: "underline" }))))).toBe("<p><u>a</u></p>");
    expect(renderToHtml(doc(para(text("a", { type: "code" }))))).toBe("<p><code>a</code></p>");
  });

  it("renders strike, which previously flattened to plain text", () => {
    expect(renderToHtml(doc(para(text("gone", { type: "strike" }))))).toBe("<p><s>gone</s></p>");
  });

  it("renders a link and keeps its href", () => {
    const html = renderToHtml(
      doc(para(text("site", { type: "link", attrs: { href: "https://example.com" } })))
    );
    expect(html).toBe('<p><a href="https://example.com">site</a></p>');
  });

  it("escapes quotes in an href so the attribute cannot be broken out of", () => {
    const html = renderToHtml(
      doc(para(text("x", { type: "link", attrs: { href: 'https://e.com/"onmouseover=' } })))
    );
    expect(html).toBe('<p><a href="https://e.com/&quot;onmouseover=">x</a></p>');
  });

  it("drops a link mark carrying no usable href rather than emitting an empty anchor", () => {
    expect(renderToHtml(doc(para(text("x", { type: "link", attrs: {} }))))).toBe("<p>x</p>");
    expect(renderToHtml(doc(para(text("x", { type: "link", attrs: { href: 42 } }))))).toBe(
      "<p>x</p>"
    );
  });

  it("renders a highlight with its palette colour", () => {
    const html = renderToHtml(
      doc(para(text("hi", { type: "highlight", attrs: { color: "var(--yellow-400)" } })))
    );
    expect(html).toBe(
      '<p><mark data-color="var(--yellow-400)" style="background-color: var(--yellow-400)">hi</mark></p>'
    );
  });

  it("renders text colour as an inline style", () => {
    const html = renderToHtml(
      doc(para(text("hi", { type: "textStyle", attrs: { color: "var(--red-600)" } })))
    );
    expect(html).toBe('<p><span style="color: var(--red-600)">hi</span></p>');
  });

  it("ignores an unknown mark instead of dropping its text", () => {
    expect(renderToHtml(doc(para(text("kept", { type: "superscript" }))))).toBe("<p>kept</p>");
  });

  it("nests marks outward in array order", () => {
    const html = renderToHtml(doc(para(text("a", { type: "bold" }, { type: "italic" }))));
    expect(html).toBe("<p><em><strong>a</strong></em></p>");
    const reversed = renderToHtml(doc(para(text("a", { type: "italic" }, { type: "bold" }))));
    expect(reversed).toBe("<p><strong><em>a</em></strong></p>");
  });

  it("nests a link outside the marks authored before it", () => {
    const html = renderToHtml(
      doc(para(text("a", { type: "bold" }, { type: "link", attrs: { href: "https://e.com" } })))
    );
    expect(html).toBe('<p><a href="https://e.com"><strong>a</strong></a></p>');
  });
});

describe("renderToHtml — rejected colours", () => {
  // Colour marks only ever carry a resolved palette token; anything else must not reach a
  // style attribute.
  const rejected = [
    "red",
    "#ff0000",
    "rgb(255,0,0)",
    "var(--x); background: url(evil)",
    'var(--x)"',
    7,
    null,
  ];

  it("falls back to an unstyled <mark> for a highlight colour outside the palette shape", () => {
    for (const color of rejected) {
      const html = renderToHtml(doc(para(text("hi", { type: "highlight", attrs: { color } }))));
      expect(html).toBe("<p><mark>hi</mark></p>");
    }
  });

  it("drops a textStyle mark entirely rather than leaving an empty span", () => {
    for (const color of rejected) {
      const html = renderToHtml(doc(para(text("hi", { type: "textStyle", attrs: { color } }))));
      expect(html).toBe("<p>hi</p>");
    }
  });

  it("emits no style attribute for a highlight with no colour at all", () => {
    expect(renderToHtml(doc(para(text("hi", { type: "highlight" }))))).toBe(
      "<p><mark>hi</mark></p>"
    );
  });
});

describe("renderToHtml — nodes", () => {
  it("renders a horizontal rule, which previously vanished", () => {
    expect(renderToHtml(doc(para(text("a")), { type: "horizontalRule" }, para(text("b"))))).toBe(
      "<p>a</p><hr><p>b</p>"
    );
  });

  it("renders every heading level, including 4–6", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const html = renderToHtml(doc({ type: "heading", attrs: { level }, content: [text("h")] }));
      expect(html).toBe(`<h${level}>h</h${level}>`);
    }
  });

  it("renders blockquotes, code blocks and hard breaks", () => {
    expect(renderToHtml(doc({ type: "blockquote", content: [para(text("q"))] }))).toBe(
      "<blockquote><p>q</p></blockquote>"
    );
    expect(renderToHtml(doc({ type: "codeBlock", content: [text("let x = 1")] }))).toBe(
      "<pre><code>let x = 1</code></pre>"
    );
    expect(renderToHtml(doc(para(text("a"), { type: "hardBreak" }, text("b"))))).toBe(
      "<p>a<br>b</p>"
    );
  });

  it("escapes markup in text so stored content cannot inject tags", () => {
    expect(renderToHtml(doc(para(text("<script>alert(1)</script>"))))).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    );
  });

  it("renders unknown nodes as their contents rather than dropping them", () => {
    expect(renderToHtml(doc({ type: "reminderItem", content: [text("ping")] }))).toBe("ping");
  });
});

describe("renderToHtml — non-JSON bodies", () => {
  it("returns an empty string for a null or empty body", () => {
    expect(renderToHtml(null)).toBe("");
    expect(renderToHtml("")).toBe("");
  });

  it("wraps a plain-text body in a paragraph, escaped", () => {
    expect(renderToHtml("hello & <b>")).toBe("<p>hello &amp; &lt;b&gt;</p>");
  });

  it("wraps malformed JSON as plain text", () => {
    expect(renderToHtml('{"type":"doc"')).toBe('<p>{"type":"doc"</p>');
  });

  it("wraps well-formed JSON that is not a doc as plain text", () => {
    expect(renderToHtml('{"type":"paragraph"}')).toBe('<p>{"type":"paragraph"}</p>');
  });
});

describe("extractPlainText", () => {
  it("separates block-level children with a newline instead of running them together", () => {
    const body = doc(
      { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
      para(text("Body"))
    );
    expect(extractPlainText(body)).toBe("Title\nBody");
  });

  it("separates list items, which previously concatenated", () => {
    const body = doc({
      type: "bulletList",
      content: [
        { type: "listItem", content: [para(text("one"))] },
        { type: "listItem", content: [para(text("two"))] },
      ],
    });
    expect(extractPlainText(body)).toBe("one\ntwo");
  });

  it("separates task items", () => {
    const body = doc({
      type: "taskList",
      content: [
        { type: "taskItem", attrs: { checked: true }, content: [para(text("done"))] },
        { type: "taskItem", attrs: { checked: false }, content: [para(text("todo"))] },
      ],
    });
    expect(extractPlainText(body)).toBe("done\ntodo");
  });

  it("keeps marked text in the haystack", () => {
    expect(extractPlainText(doc(para(text("struck", { type: "strike" }))))).toBe("struck");
  });

  it("truncates with an ellipsis past the limit", () => {
    expect(extractPlainText(doc(para(text("abcdef"))), 3)).toBe("abc…");
    expect(extractPlainText(doc(para(text("abc"))), 3)).toBe("abc");
  });

  it("falls back to the raw body for plain text, malformed JSON and null", () => {
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText("just text")).toBe("just text");
    expect(extractPlainText('{"type":"doc"')).toBe('{"type":"doc"');
    expect(extractPlainText("abcdef", 3)).toBe("abc");
  });
});

describe("isRichTextJson / wrapPlainTextAsDoc", () => {
  it("recognises only a doc node", () => {
    expect(isRichTextJson(doc(para(text("a"))))).toBe(true);
    expect(isRichTextJson("plain")).toBe(false);
    expect(isRichTextJson('{"type":"paragraph"}')).toBe(false);
    expect(isRichTextJson(null)).toBe(false);
  });

  it("round-trips plain text through a doc", () => {
    const body = wrapPlainTextAsDoc("one\ntwo");
    expect(isRichTextJson(body)).toBe(true);
    expect(renderToHtml(body)).toBe("<p>one</p><p>two</p>");
    expect(extractPlainText(body)).toBe("one\ntwo");
  });

  it("keeps a blank line as an empty paragraph", () => {
    expect(renderToHtml(wrapPlainTextAsDoc("a\n\nb"))).toBe("<p>a</p><p></p><p>b</p>");
  });
});

describe("normalizeHref", () => {
  it("passes an already-absolute allowed URL through", () => {
    expect(normalizeHref("https://example.com/a?b=1#c")).toBe("https://example.com/a?b=1#c");
    expect(normalizeHref("http://example.com")).toBe("http://example.com/");
    expect(normalizeHref("mailto:someone@example.com")).toBe("mailto:someone@example.com");
  });

  it("gives a host-shaped scheme-less href an https scheme", () => {
    expect(normalizeHref("example.com/foo")).toBe("https://example.com/foo");
    expect(normalizeHref("www.example.com")).toBe("https://www.example.com/");
  });

  it("resolves a protocol-relative href rather than leaving it relative", () => {
    expect(normalizeHref("//example.com")).toBe("https://example.com/");
  });

  it("rejects a relative path, which is not a link off this page", () => {
    expect(normalizeHref("/gallery/1")).toBeNull();
    expect(normalizeHref("gallery")).toBeNull();
  });

  it("rejects every scheme outside the allowlist, whatever its casing", () => {
    expect(normalizeHref("javascript:alert(1)")).toBeNull();
    expect(normalizeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(normalizeHref("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(normalizeHref("ftp://example.com")).toBeNull();
    expect(normalizeHref("file:///etc/passwd")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeHref("  https://example.com/padded  ")).toBe("https://example.com/padded");
  });

  it("returns null for nothing at all", () => {
    expect(normalizeHref(null)).toBeNull();
    expect(normalizeHref(undefined)).toBeNull();
    expect(normalizeHref("")).toBeNull();
    expect(normalizeHref("   ")).toBeNull();
  });
});

// The rich-text renderer and JSON helpers now live in @jf/ui so they can be shared with
// other apps (e.g. Exposer). Re-exported here to keep the existing `@/lib/note-body-utils`
// import surface stable.
export {
  extractPlainText,
  isRichTextJson,
  renderToHtml,
  wrapPlainTextAsDoc,
} from "@jf/ui/rich-text";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders assistant markdown (lists, tables, code, emphasis) inside a chat
// bubble. We style elements with child-combinator utilities rather than the
// `prose` typography plugin (not installed) so the app's CSS-variable theming
// stays in control. First/last margins are collapsed so the bubble padding
// stays tight around the content.
const MARKDOWN_CLASSES = [
  "text-sm leading-relaxed",
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_p]:my-1",
  "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_li]:my-0.5 [&_li>ul]:my-0.5 [&_li>ol]:my-0.5",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-semibold",
  "[&_em]:italic",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-(--surface-300) [&_blockquote]:pl-3 [&_blockquote]:text-(--grey-500)",
  "[&_hr]:my-3 [&_hr]:border-(--surface-300)",
  "[&_code]:rounded [&_code]:bg-(--surface-200) [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-[8px] [&_pre]:bg-(--surface-200) [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[0.85em]",
  "[&_table]:my-2 [&_table]:block [&_table]:w-fit [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-xs",
  "[&_th]:border [&_th]:border-(--surface-300) [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold",
  "[&_td]:border [&_td]:border-(--surface-300) [&_td]:px-2 [&_td]:py-1",
].join(" ");

export function Markdown({ children }: { children: string }) {
  return (
    <div className={MARKDOWN_CLASSES}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

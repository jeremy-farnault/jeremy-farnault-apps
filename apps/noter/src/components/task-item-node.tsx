"use client";

import { Checkbox, cn } from "@jf/ui";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function TaskItemNode({ node, updateAttributes }: NodeViewProps) {
  const checked: boolean = node.attrs.checked ?? false;

  return (
    <NodeViewWrapper as="li" className="flex items-start gap-1.5 my-0.5 list-none">
      <Checkbox
        checked={checked}
        onChange={(val) => updateAttributes({ checked: val })}
        className="mt-0.5"
      />
      <NodeViewContent
        as="div"
        className={cn("flex-1 text-sm min-w-0", checked && "[&_p]:line-through [&_p]:opacity-50")}
      />
    </NodeViewWrapper>
  );
}

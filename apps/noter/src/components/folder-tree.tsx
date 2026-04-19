"use client";

import type { Folder } from "@/lib/queries";
import { ArrowElbowDownRightIcon, MapPinIcon } from "@phosphor-icons/react";

type FolderNode = Pick<Folder, "id" | "name" | "parentFolderId">;

type Props = {
  folders: FolderNode[];
  currentParentFolderId: string | null;
  onPick: (folderId: string | null) => void;
  isPending: boolean;
};

type TreeNodeProps = {
  node: FolderNode;
  allFolders: FolderNode[];
  depth: number;
  currentParentFolderId: string | null;
  onPick: (folderId: string | null) => void;
  isPending: boolean;
};

function TreeNode({
  node,
  allFolders,
  depth,
  currentParentFolderId,
  onPick,
  isPending,
}: TreeNodeProps) {
  const children = allFolders.filter((f) => f.parentFolderId === node.id);
  const isCurrent = node.id === currentParentFolderId;

  return (
    <>
      <button
        type="button"
        onClick={() => onPick(node.id)}
        disabled={isPending}
        style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
        className="w-full flex items-center gap-1.5 rounded-[10px] pr-3 py-2 text-left text-sm text-(--grey-900) hover:bg-(--surface-150) disabled:opacity-50 transition-colors"
      >
        <ArrowElbowDownRightIcon size={14} className="shrink-0 text-(--grey-400)" />
        <span className="flex-1">{node.name}</span>
        {isCurrent && <MapPinIcon size={14} weight="fill" className="shrink-0 text-(--grey-500)" />}
      </button>
      {children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          allFolders={allFolders}
          depth={depth + 1}
          currentParentFolderId={currentParentFolderId}
          onPick={onPick}
          isPending={isPending}
        />
      ))}
    </>
  );
}

export function FolderTree({ folders, currentParentFolderId, onPick, isPending }: Props) {
  const roots = folders.filter((f) => f.parentFolderId === null);
  const isHomeActive = currentParentFolderId === null;

  return (
    <div className="flex flex-col gap-0.5 mt-1 overflow-y-auto max-h-72">
      <button
        type="button"
        onClick={() => onPick(null)}
        disabled={isPending}
        className="w-full flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) hover:bg-(--surface-150) disabled:opacity-50 transition-colors"
      >
        <span className="flex-1">Home</span>
        {isHomeActive && (
          <MapPinIcon size={14} weight="fill" className="shrink-0 text-(--grey-500)" />
        )}
      </button>
      {roots.map((root) => (
        <TreeNode
          key={root.id}
          node={root}
          allFolders={folders}
          depth={1}
          currentParentFolderId={currentParentFolderId}
          onPick={onPick}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

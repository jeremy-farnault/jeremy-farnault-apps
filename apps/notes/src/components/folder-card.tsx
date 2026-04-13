"use client";

import type { Folder as FolderRow } from "@/lib/queries";
import { FolderIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { FolderActionsMenu } from "./folder-actions-menu";

type Props = {
  folder: FolderRow;
  allFolders: FolderRow[];
};

export function FolderCard({ folder, allFolders }: Props) {
  const router = useRouter();
  const pointerDownOnCard = useRef(false);

  return (
    <button
      type="button"
      onPointerDown={() => { pointerDownOnCard.current = true; }}
      onClick={() => {
        if (!pointerDownOnCard.current) return;
        pointerDownOnCard.current = false;
        router.push(`/${folder.id}`);
      }}
      className="group relative flex h-[150px] w-full flex-col rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4 shadow-sm hover:bg-(--surface-200) cursor-pointer text-left"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <FolderIcon size={20} className="shrink-0 text-(--grey-700)" />
          <span className="text-sm font-semibold text-(--grey-900) truncate">{folder.name}</span>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <FolderActionsMenu folder={folder} allFolders={allFolders} />
      </div>
    </button>
  );
}

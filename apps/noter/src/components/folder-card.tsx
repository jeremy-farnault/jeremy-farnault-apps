"use client";

import type { Folder as FolderRow } from "@/lib/queries";
import { FolderIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FolderActionsMenu } from "./folder-actions-menu";

type Props = {
  folder: FolderRow;
  allFolders: FolderRow[];
};

export function FolderCard({ folder, allFolders }: Props) {
  const router = useRouter();
  const pointerDownOnCard = useRef(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) setMenuVisible(true);
  }, []);

  return (
    <div
      className="group relative flex h-[150px] w-full flex-col rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4 shadow-sm hover:bg-(--surface-200)"
      onMouseEnter={() => setMenuVisible(true)}
      onMouseLeave={() => setMenuVisible(false)}
    >
      <button
        type="button"
        aria-label={`Open folder ${folder.name}`}
        onPointerDown={() => {
          pointerDownOnCard.current = true;
        }}
        onClick={() => {
          if (!pointerDownOnCard.current) return;
          pointerDownOnCard.current = false;
          router.push(`/${folder.id}`);
        }}
        className="absolute inset-0 rounded-[22px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
      />

      <div className="relative flex flex-1 flex-col pointer-events-none">
        <div className="flex items-center gap-2">
          <FolderIcon size={20} className="shrink-0 text-(--grey-700)" />
          <span className="text-sm font-semibold text-(--grey-900) truncate">{folder.name}</span>
        </div>
      </div>

      <div className="relative flex justify-end mt-2">
        <FolderActionsMenu folder={folder} allFolders={allFolders} menuVisible={menuVisible} />
      </div>
    </div>
  );
}

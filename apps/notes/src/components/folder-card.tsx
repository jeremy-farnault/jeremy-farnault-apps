"use client";

import { Folder } from "lucide-react";
import Link from "next/link";
import type { Folder as FolderRow } from "@/lib/queries";
import { FolderActionsMenu } from "./folder-actions-menu";

type Props = {
  folder: FolderRow;
  allFolders: FolderRow[];
};

export function FolderCard({ folder, allFolders }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Link href={`/${folder.id}`} style={{ flex: 1 }}>
        <div>
          <Folder size={20} />
          <span>{folder.name}</span>
        </div>
      </Link>
      <FolderActionsMenu folder={folder} allFolders={allFolders} />
    </div>
  );
}

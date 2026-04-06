import type { Folder as FolderRow } from "@/lib/queries";
import Link from "next/link";
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
          <span>{folder.name}</span>
        </div>
      </Link>
      <FolderActionsMenu folder={folder} allFolders={allFolders} />
    </div>
  );
}

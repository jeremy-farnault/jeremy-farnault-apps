import { FolderIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Folder as FolderRow } from "@/lib/queries";
import { FolderActionsMenu } from "./folder-actions-menu";

type Props = {
  folder: FolderRow;
  allFolders: FolderRow[];
};

export function FolderCard({ folder, allFolders }: Props) {
  return (
    <div className="relative flex h-[200px] flex-col overflow-hidden rounded-[22px] border border-(--grey-200) bg-(--surface-100) p-4 shadow-sm">
      <Link href={`/${folder.id}`} className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <FolderIcon size={20} className="shrink-0 text-(--grey-700)" />
          <span className="text-sm font-semibold text-(--grey-900) truncate">
            {folder.name}
          </span>
        </div>
      </Link>

      <div className="flex justify-end mt-2">
        <FolderActionsMenu folder={folder} allFolders={allFolders} />
      </div>
    </div>
  );
}

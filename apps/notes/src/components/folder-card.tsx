import type { Folder as FolderRow } from "@/lib/queries";
import { FolderIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { FolderActionsMenu } from "./folder-actions-menu";

type Props = {
  folder: FolderRow;
  allFolders: FolderRow[];
};

export function FolderCard({ folder, allFolders }: Props) {
  return (
    <Link href={`/${folder.id}`} className="group relative flex h-[150px] flex-col rounded-[22px] border border-(--grey-200) bg-(--surface-150) p-4 shadow-sm hover:bg-(--surface-200) cursor-pointer">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <FolderIcon size={20} className="shrink-0 text-(--grey-700)" />
          <span className="text-sm font-semibold text-(--grey-900) truncate">{folder.name}</span>
        </div>
      </div>

      <div className="flex justify-end mt-2">
        <FolderActionsMenu folder={folder} allFolders={allFolders} />
      </div>
    </Link>
  );
}

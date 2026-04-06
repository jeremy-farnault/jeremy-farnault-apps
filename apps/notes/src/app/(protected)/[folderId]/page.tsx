import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ItemsGrid } from "@/components/items-grid";
import {
  getAllFolders,
  getFolderBreadcrumb,
  getFolderById,
  getFolderContents,
  type SortOption,
} from "@/lib/queries";

type Props = {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export default async function FolderPage({ params, searchParams }: Props) {
  const { folderId } = await params;
  const { sort: sortParam } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(folderId)) notFound();

  const folder = await getFolderById(userId, folderId);
  if (!folder) notFound();

  const [{ folders, notes }, crumbs, allFolders] = await Promise.all([
    getFolderContents(userId, folderId),
    getFolderBreadcrumb(folderId),
    getAllFolders(userId),
  ]);

  const sort = (sortParam as SortOption | undefined) ?? "modified-desc";

  return (
    <ItemsGrid
      folders={folders}
      notes={notes}
      sort={sort}
      breadcrumb={<Breadcrumb crumbs={crumbs} />}

      currentFolderId={folderId}
      allFolders={allFolders}
    />
  );
}

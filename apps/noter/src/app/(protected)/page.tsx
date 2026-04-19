import { Breadcrumb } from "@/components/breadcrumb";
import { ItemsGrid } from "@/components/items-grid";
import { type SortOption, getAllFolders, getFolderContents } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

type Props = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function RootPage({ searchParams }: Props) {
  const { sort: sortParam } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [{ folders, notes }, allFolders] = await Promise.all([
    getFolderContents(userId, null),
    getAllFolders(userId),
  ]);

  const sort = (sortParam as SortOption | undefined) ?? "modified-desc";

  return (
    <ItemsGrid
      allFolders={allFolders}
      breadcrumb={<Breadcrumb crumbs={[]} />}
      currentFolderId={null}
      folders={folders}
      notes={notes}
      sort={sort}
    />
  );
}

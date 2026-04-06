import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { Breadcrumb } from "@/components/breadcrumb";
import { ItemsGrid } from "@/components/items-grid";
import { getAllFolders, getFolderContents, type SortOption } from "@/lib/queries";

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
      folders={folders}
      notes={notes}
      sort={sort}
      breadcrumb={<Breadcrumb crumbs={[]} />}

      currentFolderId={null}
      allFolders={allFolders}
    />
  );
}

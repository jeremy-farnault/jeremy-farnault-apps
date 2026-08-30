import { PortfolioFeed } from "@/components/portfolio-feed";
import { getFeedPage, getFilterableTags, getUserByHandle } from "@/lib/queries";
import { getSessionUser } from "@/lib/user";
import { notFound } from "next/navigation";

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const owner = await getUserByHandle(handle);
  if (!owner) notFound();

  const me = await getSessionUser();
  const isOwner = me?.id === owner.id;

  const [{ items, nextCursor }, availableTags] = await Promise.all([
    getFeedPage(owner.id, isOwner, null),
    getFilterableTags(owner.id, isOwner),
  ]);

  return (
    <PortfolioFeed
      handle={handle}
      isOwner={isOwner}
      initialItems={items}
      initialCursor={nextCursor}
      availableTags={availableTags}
    />
  );
}

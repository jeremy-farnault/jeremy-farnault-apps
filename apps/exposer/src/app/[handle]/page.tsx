import { PortfolioFeed } from "@/components/portfolio-feed";
import { getFeedPage, getUserByHandle } from "@/lib/queries";
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

  const { items, nextCursor } = await getFeedPage(owner.id, isOwner, null);

  return (
    <PortfolioFeed
      handle={handle}
      isOwner={isOwner}
      initialItems={items}
      initialCursor={nextCursor}
    />
  );
}

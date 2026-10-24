import { WishlistClient } from "@/components/wishlist-client";
import { getWishlist } from "@/lib/queries";
import { parseSort, sortItems, summarizeItem } from "@/lib/summary";
import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { getExchangeRates } from "@jf/db";
import { headers } from "next/headers";

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function WishlistPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";
  const sort = parseSort((await searchParams).sort);

  const [items, rates, settings] = await Promise.all([
    getWishlist(userId),
    getExchangeRates(),
    getUserSettings(userId),
  ]);
  const summaries = sortItems(
    items.map((item) => summarizeItem(item, rates, settings.homeCurrency)),
    sort
  );

  return <WishlistClient items={summaries} homeCurrency={settings.homeCurrency} sort={sort} />;
}

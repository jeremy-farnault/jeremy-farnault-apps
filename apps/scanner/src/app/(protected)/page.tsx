import { WishlistClient } from "@/components/wishlist-client";
import { getWishlist } from "@/lib/queries";
import { parseSort } from "@/lib/summary";
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

  // Summarised on the client, so a row can be recomputed as soon as its check comes back.
  return (
    <WishlistClient items={items} rates={rates} homeCurrency={settings.homeCurrency} sort={sort} />
  );
}

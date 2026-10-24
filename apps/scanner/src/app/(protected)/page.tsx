import { WishlistClient } from "@/components/wishlist-client";
import { getWishlist } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function WishlistPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const items = session ? await getWishlist(session.user.id) : [];

  return <WishlistClient items={items} />;
}

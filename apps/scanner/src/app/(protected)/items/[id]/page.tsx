import { getItem, getUserStores } from "@/lib/queries";
import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { getExchangeRates } from "@jf/db";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ItemDetailClient } from "./item-detail-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ discover?: string }>;
}) {
  const { id } = await params;
  // Set right after adding a new item, so the search in other stores opens by itself.
  const discover = (await searchParams).discover === "1";
  if (!UUID_RE.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [item, rates, settings, userStores] = await Promise.all([
    getItem(userId, id),
    getExchangeRates(),
    getUserSettings(userId),
    getUserStores(userId),
  ]);
  if (!item) notFound();

  return (
    <ItemDetailClient
      item={item}
      rates={rates}
      homeCurrency={settings.homeCurrency}
      userStores={userStores}
      discover={discover}
    />
  );
}

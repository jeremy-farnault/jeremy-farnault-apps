import { getItem } from "@/lib/queries";
import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { getExchangeRates } from "@jf/db";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ItemDetailClient } from "./item-detail-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [item, rates, settings] = await Promise.all([
    getItem(userId, id),
    getExchangeRates(),
    getUserSettings(userId),
  ]);
  if (!item) notFound();

  return <ItemDetailClient item={item} rates={rates} homeCurrency={settings.homeCurrency} />;
}

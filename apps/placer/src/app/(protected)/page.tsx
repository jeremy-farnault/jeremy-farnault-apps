import { PlacerClient } from "@/components/placer-client";
import { getCategories, getSpots } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function PlacerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [categories, spots] = await Promise.all([getCategories(userId), getSpots(userId)]);

  return <PlacerClient spots={spots} categories={categories} />;
}

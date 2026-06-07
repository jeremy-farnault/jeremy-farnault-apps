import { MapCta } from "@/components/map-cta";
import { getCategories, getSpots } from "@/lib/queries";
import { auth } from "@jf/auth";
import dynamic from "next/dynamic";
import { headers } from "next/headers";

const PlacerMap = dynamic(
  () => import("@/components/placer-map").then((m) => ({ default: m.PlacerMap })),
  { ssr: false }
);

export default async function PlacerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [categories, spots] = await Promise.all([getCategories(userId), getSpots(userId)]);

  return (
    <main className="relative h-full w-full">
      <PlacerMap spots={spots} />
      <MapCta categories={categories} />
    </main>
  );
}

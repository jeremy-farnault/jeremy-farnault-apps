"use client";

import type { CategoryRow, SpotRow } from "@/lib/queries";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { SelectedLocation } from "./location-search-modal";
import { MapCta } from "./map-cta";

const PlacerMap = dynamic(() => import("./placer-map").then((m) => ({ default: m.PlacerMap })), {
  ssr: false,
});

interface PlacerClientProps {
  spots: SpotRow[];
  categories: CategoryRow[];
}

export function PlacerClient({ spots, categories }: PlacerClientProps) {
  const [pendingLocation, setPendingLocation] = useState<SelectedLocation | null>(null);

  return (
    <main className="relative h-full w-full">
      <PlacerMap spots={spots} pendingLocation={pendingLocation} />
      <MapCta
        categories={categories}
        onLocationSelected={setPendingLocation}
        onSpotFormClosed={() => setPendingLocation(null)}
      />
    </main>
  );
}

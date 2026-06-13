"use client";

import type { CategoryRow, SpotRow } from "@/lib/queries";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { SelectedLocation } from "./location-search-modal";
import { MapCta } from "./map-cta";
import { MapSearchBar } from "./map-search-bar";

const PlacerMap = dynamic(() => import("./placer-map").then((m) => ({ default: m.PlacerMap })), {
  ssr: false,
});

interface PlacerClientProps {
  spots: SpotRow[];
  categories: CategoryRow[];
}

export function PlacerClient({ spots, categories }: PlacerClientProps) {
  const [pendingLocation, setPendingLocation] = useState<SelectedLocation | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  return (
    <main className="relative w-full p-3" style={{ height: "calc(100dvh - 56px)" }}>
      <PlacerMap
        spots={spots}
        pendingLocation={pendingLocation}
        flyToTarget={flyToTarget}
        activeCategoryId={activeCategoryId}
      />
      <MapSearchBar
        spots={spots}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onFlyTo={setFlyToTarget}
        onCategoryChange={setActiveCategoryId}
      />
      <MapCta
        categories={categories}
        onLocationSelected={setPendingLocation}
        onSpotFormClosed={() => setPendingLocation(null)}
      />
    </main>
  );
}

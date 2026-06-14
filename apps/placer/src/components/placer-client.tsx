"use client";

import type { CategoryRow, SpotRow } from "@/lib/queries";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { SelectedLocation } from "./location-search-modal";
import { MapCta } from "./map-cta";
import { MapSearchBar } from "./map-search-bar";
import { SpotFormModal } from "./spot-form-modal";

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
  const [pinnableLocation, setPinnableLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [pinSpotOpen, setPinSpotOpen] = useState(false);

  return (
    <main className="relative w-full p-3" style={{ height: "calc(100dvh - 56px)" }}>
      <PlacerMap
        spots={spots}
        categories={categories}
        pendingLocation={pendingLocation}
        flyToTarget={flyToTarget}
        activeCategoryId={activeCategoryId}
        pinnableLocation={pinnableLocation}
        onPinClick={() => setPinSpotOpen(true)}
        onMapDoubleClick={(loc) => {
          setPinnableLocation(loc);
          setPinSpotOpen(true);
        }}
      />
      <MapSearchBar
        spots={spots}
        categories={categories}
        activeCategoryId={activeCategoryId}
        onFlyTo={setFlyToTarget}
        onCategoryChange={setActiveCategoryId}
        onPinLocation={setPinnableLocation}
      />
      <MapCta
        categories={categories}
        onLocationSelected={setPendingLocation}
        onSpotFormClosed={() => setPendingLocation(null)}
      />
      <SpotFormModal
        isOpen={pinSpotOpen}
        onClose={() => {
          setPinSpotOpen(false);
          setPinnableLocation(null);
        }}
        location={pinnableLocation}
        categories={categories}
      />
    </main>
  );
}

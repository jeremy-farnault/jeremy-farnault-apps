"use client";

import { CategoryModal } from "@/components/category-modal";
import { LocationSearchModal, type SelectedLocation } from "@/components/location-search-modal";
import { SpotFormModal } from "@/components/spot-form-modal";
import type { CategoryRow } from "@/lib/queries";
import { MapPinIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface MapCtaProps {
  categories: CategoryRow[];
  onLocationSelected: (location: SelectedLocation) => void;
  onSpotFormClosed: () => void;
}

export function MapCta({ categories, onLocationSelected, onSpotFormClosed }: MapCtaProps) {
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [spotFormOpen, setSpotFormOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  function handleLocationSelect(location: SelectedLocation) {
    setSelectedLocation(location);
    setLocationSearchOpen(false);
    setSpotFormOpen(true);
    onLocationSelected(location);
  }

  function handleSpotFormClose() {
    setSpotFormOpen(false);
    setSelectedLocation(null);
    onSpotFormClosed();
  }

  return (
    <>
      <div
        className="absolute bottom-8 left-1/2 z-[3000] flex -translate-x-1/2 gap-3"
        style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <button
          type="button"
          onClick={() => setCategoryModalOpen(true)}
          aria-label="Add category"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
        >
          <PlusCircleIcon size={22} />
        </button>
        <button
          type="button"
          onClick={() => setLocationSearchOpen(true)}
          aria-label="Add spot"
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
        >
          <MapPinIcon size={22} />
        </button>
      </div>

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
      />

      <LocationSearchModal
        isOpen={locationSearchOpen}
        onClose={() => setLocationSearchOpen(false)}
        onSelect={handleLocationSelect}
      />

      <SpotFormModal
        isOpen={spotFormOpen}
        onClose={handleSpotFormClose}
        location={selectedLocation}
        categories={categories}
      />
    </>
  );
}

"use client";

import type { Poi } from "@/config/game";
import { Marker } from "react-map-gl/mapbox";

interface Props {
  poi: Poi;
  onSelect: (poi: Poi) => void;
}

export function HomeMarker({ poi, onSelect }: Props) {
  return (
    <Marker longitude={poi.longitude} latitude={poi.latitude} anchor="bottom">
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(poi);
        }}
      >
        🏠
      </button>
    </Marker>
  );
}

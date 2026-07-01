"use client";

import type { Poi } from "@/config/game";
import { Marker, Popup } from "react-map-gl/mapbox";

interface Props {
  pois: Poi[];
  selectedId: string | null;
  onSelect: (poi: Poi | null) => void;
  onGoHere: (poi: Poi) => void;
}

export function PoiMarkers({ pois, selectedId, onSelect, onGoHere }: Props) {
  const selected = pois.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={poi.id}
          longitude={poi.longitude}
          latitude={poi.latitude}
          anchor="bottom"
          onClick={() => onSelect(poi)}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none">
            {poi.emoji}
          </div>
        </Marker>
      ))}

      {selected && (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="bottom"
          offset={40}
          onClose={() => onSelect(null)}
          closeButton={false}
          className="tracer-popup"
        >
          <div className="flex flex-col gap-2 p-1 min-w-32">
            <div>
              <p className="text-sm font-semibold text-white">{selected.label}</p>
              <p className="text-xs text-white/50 capitalize">{selected.category}</p>
            </div>
            <button
              type="button"
              onClick={() => onGoHere(selected)}
              className="w-full rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-1.5 transition-colors"
            >
              Go here
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}

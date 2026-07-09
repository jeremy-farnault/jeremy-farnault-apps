"use client";

import type { Poi } from "@/config/game";
import { Marker, Popup } from "react-map-gl/mapbox";

interface Props {
  pois: Poi[];
  selectedId: string | null;
  onSelect: (poi: Poi | null) => void;
  onGoHere: (poi: Poi) => void;
  onShop?: (poi: Poi) => void;
  onEat?: (poi: Poi) => void;
  onWork?: (poi: Poi) => void;
  disabled?: boolean;
}

export function PoiMarkers({
  pois,
  selectedId,
  onSelect,
  onGoHere,
  onShop,
  onEat,
  onWork,
  disabled,
}: Props) {
  const selected = pois.find((p) => p.id === selectedId) ?? null;

  return (
    <>
      {pois.map((poi) => (
        <Marker key={poi.id} longitude={poi.longitude} latitude={poi.latitude} anchor="bottom">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(poi);
            }}
          >
            {poi.emoji}
          </button>
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
          closeOnClick={false}
          className="tracer-popup"
        >
          <div className="flex flex-col gap-2 p-1 min-w-32">
            <div>
              <p className="text-sm font-semibold text-white">{selected.label}</p>
              <p className="text-xs text-white/50 capitalize">{selected.category}</p>
            </div>
            {onShop && (
              <button
                type="button"
                onClick={() => onShop(selected)}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-1.5 transition-colors"
              >
                Shop
              </button>
            )}
            {onEat && (
              <button
                type="button"
                onClick={() => onEat(selected)}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-1.5 transition-colors"
              >
                Eat
              </button>
            )}
            {onWork && (
              <button
                type="button"
                onClick={() => onWork(selected)}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-1.5 transition-colors"
              >
                Work
              </button>
            )}
            <button
              type="button"
              onClick={() => !disabled && onGoHere(selected)}
              disabled={disabled}
              className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 transition-colors"
            >
              Go here
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}

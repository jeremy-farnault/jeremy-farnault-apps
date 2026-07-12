"use client";

import type { Poi } from "@/config/game";
import { Marker, Popup } from "react-map-gl/mapbox";

interface Props {
  poi: Poi;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onGoHere: (poi: Poi) => void;
  disabled?: boolean;
}

export function HomeMarker({ poi, open, onToggle, onClose, onGoHere, disabled }: Props) {
  return (
    <>
      <Marker longitude={poi.longitude} latitude={poi.latitude} anchor="bottom">
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          🏠
        </button>
      </Marker>

      {open && (
        <Popup
          longitude={poi.longitude}
          latitude={poi.latitude}
          anchor="bottom"
          offset={40}
          onClose={onClose}
          closeButton={false}
          closeOnClick={true}
          className="tracer-popup"
        >
          <div className="flex flex-col gap-2 p-1 min-w-32">
            <p className="text-sm font-semibold text-white">{poi.label}</p>
            <button
              type="button"
              onClick={() => {
                onGoHere(poi);
                onClose();
              }}
              disabled={disabled}
              className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 transition-colors"
            >
              Go home
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}

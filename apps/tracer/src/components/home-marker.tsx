"use client";

import type { Poi } from "@/config/game";
import { useState } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";

interface Props {
  poi: Poi;
  onGoHere: (poi: Poi) => void;
  disabled?: boolean;
}

export function HomeMarker({ poi, onGoHere, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Marker longitude={poi.longitude} latitude={poi.latitude} anchor="bottom">
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
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
          onClose={() => setOpen(false)}
          closeButton={false}
          closeOnClick={false}
          className="tracer-popup"
        >
          <div className="flex flex-col gap-2 p-1 min-w-32">
            <p className="text-sm font-semibold text-white">{poi.label}</p>
            <button
              type="button"
              onClick={() => {
                onGoHere(poi);
                setOpen(false);
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

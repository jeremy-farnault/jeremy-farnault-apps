"use client";

import type { Npc } from "@/config/npcs";
import { useMapViewport } from "@/hooks/use-map-viewport";
import { sizeForZoom } from "@/lib/marker-size";
import { Marker } from "react-map-gl/mapbox";

interface Props {
  npc: Npc;
  longitude: number;
  latitude: number;
  detected?: boolean;
  onSelect: (npc: Npc) => void;
}

export function NpcMarker({ npc, longitude, latitude, detected, onSelect }: Props) {
  const { zoom } = useMapViewport();
  const size = sizeForZoom(zoom);

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <button
        type="button"
        className="cursor-pointer select-none"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(npc);
        }}
      >
        <div className="relative">
          {detected && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm leading-none">
              ❗
            </span>
          )}
          <img
            src={`/sprites/${npc.id}/idle/frame-1.png`}
            width={size}
            height={size}
            style={{ imageRendering: "pixelated" }}
            alt={npc.label}
          />
        </div>
      </button>
    </Marker>
  );
}

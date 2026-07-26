"use client";

import type { Npc } from "@/config/npcs";
import { useMapViewport } from "@/hooks/use-map-viewport";
import { sizeForZoom } from "@/lib/marker-size";
import { Marker } from "react-map-gl/mapbox";

interface Props {
  npc: Npc;
  onSelect: (npc: Npc) => void;
}

export function NpcMarker({ npc, onSelect }: Props) {
  const { zoom } = useMapViewport();
  const size = sizeForZoom(zoom);

  return (
    <Marker longitude={npc.longitude} latitude={npc.latitude} anchor="bottom">
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
        <img
          src={`/sprites/${npc.id}/idle/frame-1.png`}
          width={size}
          height={size}
          style={{ imageRendering: "pixelated" }}
          alt={npc.label}
        />
      </button>
    </Marker>
  );
}

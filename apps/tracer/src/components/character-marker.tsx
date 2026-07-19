"use client";

import { useMapViewport } from "@/hooks/use-map-viewport";
import { Marker } from "react-map-gl/mapbox";

interface Props {
  longitude: number;
  latitude: number;
}

const BASE_SIZE = 64;
const REF_ZOOM = 15;
const MIN_SIZE = 24;
const MAX_SIZE = 64;

function sizeForZoom(zoom: number): number {
  if (zoom === 0) return BASE_SIZE; // sentinel: map not yet mounted
  const raw = BASE_SIZE * 2 ** ((zoom - REF_ZOOM) * 0.5);
  return Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, raw)));
}

export function CharacterMarker({ longitude, latitude }: Props) {
  const { zoom } = useMapViewport();
  const size = sizeForZoom(zoom);

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div
        className="pointer-events-none"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        <img
          src="/sprites/idle/frame-1.png"
          width={size}
          height={size}
          style={{ imageRendering: "pixelated" }}
          alt=""
        />
      </div>
    </Marker>
  );
}

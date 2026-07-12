"use client";

import { Marker } from "react-map-gl/mapbox";

interface Props {
  longitude: number;
  latitude: number;
  onClick?: () => void;
}

export function CharacterMarker({ longitude, latitude, onClick }: Props) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="cursor-pointer bg-transparent border-0 p-0"
      >
        <img
          src="/sprites/idle/frame-1.png"
          width={32}
          height={32}
          style={{ imageRendering: "pixelated" }}
          alt=""
        />
      </button>
    </Marker>
  );
}

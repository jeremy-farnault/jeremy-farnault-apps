"use client";

import { Marker } from "react-map-gl/mapbox";

interface Props {
  longitude: number;
  latitude: number;
}

export function CharacterMarker({ longitude, latitude }: Props) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div className="pointer-events-none">
        <img
          src="/sprites/idle/frame-1.png"
          width={64}
          height={64}
          style={{ imageRendering: "pixelated" }}
          alt=""
        />
      </div>
    </Marker>
  );
}

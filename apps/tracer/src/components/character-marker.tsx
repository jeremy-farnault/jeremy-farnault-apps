"use client";

import { useEffect, useState } from "react";
import { Marker } from "react-map-gl/mapbox";

const IDLE_FRAMES = [
  "/sprites/idle/frame-1.png",
  "/sprites/idle/frame-2.png",
  "/sprites/idle/frame-3.png",
  "/sprites/idle/frame-4.png",
];

interface Props {
  longitude: number;
  latitude: number;
}

export function CharacterMarker({ longitude, latitude }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % IDLE_FRAMES.length), 150);
    return () => clearInterval(id);
  }, []);

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <img
        src={IDLE_FRAMES[frame]}
        width={64}
        height={64}
        style={{ imageRendering: "pixelated" }}
        alt=""
      />
    </Marker>
  );
}

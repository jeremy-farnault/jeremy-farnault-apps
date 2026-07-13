"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";

export type Viewport = {
  zoom: number;
  bbox: [number, number, number, number]; // [west, south, east, north]
};

const SENTINEL: Viewport = { zoom: 0, bbox: [-180, -85, 180, 85] };

export function useMapViewport(): Viewport {
  const { current: map } = useMap();
  const [viewport, setViewport] = useState<Viewport>(SENTINEL);

  useEffect(() => {
    if (!map) return;

    const update = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      setViewport({
        zoom: map.getZoom(),
        bbox: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      });
    };

    update();
    map.on("move", update);
    return () => {
      map.off("move", update);
    };
  }, [map]);

  return viewport;
}

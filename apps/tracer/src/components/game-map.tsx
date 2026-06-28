"use client";

import MapGL from "react-map-gl/mapbox";

const HIGASHI_JUJO = {
  longitude: 139.7413,
  latitude: 35.7745,
  zoom: 15,
};

export function GameMap() {
  return (
    <MapGL
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      initialViewState={HIGASHI_JUJO}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
    />
  );
}

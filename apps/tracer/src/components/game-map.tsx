"use client";

import MapGL from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";

const HIGASHI_JUJO = {
  longitude: 139.72691,
  latitude: 35.76988,
  zoom: 15,
};

export function GameMap() {
  return (
    <MapGL
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      initialViewState={HIGASHI_JUJO}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
    >
      <CharacterMarker longitude={HIGASHI_JUJO.longitude} latitude={HIGASHI_JUJO.latitude} />
    </MapGL>
  );
}

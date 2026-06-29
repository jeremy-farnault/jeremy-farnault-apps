"use client";

import { INITIAL_ZONE, MAP_INITIAL_VIEW, PLAYER_HOME, ZONE_STYLE } from "@/config/game";
import MapGL from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";
import { TerritoryZone } from "./territory-zone";

export function GameMap() {
  return (
    <MapGL
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
      initialViewState={MAP_INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
    >
      <TerritoryZone
        data={INITIAL_ZONE}
        fillColor={ZONE_STYLE.fillColor}
        fillOpacity={ZONE_STYLE.fillOpacity}
        lineColor={ZONE_STYLE.lineColor}
        lineWidth={ZONE_STYLE.lineWidth}
      />
      <CharacterMarker longitude={PLAYER_HOME.longitude} latitude={PLAYER_HOME.latitude} />
    </MapGL>
  );
}

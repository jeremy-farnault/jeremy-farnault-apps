"use client";

import { INITIAL_ZONE, MAP_INITIAL_VIEW, POIS, ZONE_STYLE } from "@/config/game";
import type { Poi } from "@/config/game";
import { useTravel } from "@/hooks/use-travel";
import { fetchRoute, formatDistance, formatDuration } from "@/lib/directions";
import type { RouteResult } from "@/lib/directions";
import { useState } from "react";
import MapGL from "react-map-gl/mapbox";
import { Layer, Source } from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";
import { PoiMarkers } from "./poi-markers";
import { TerritoryZone } from "./territory-zone";

export function GameMap() {
  const { characterPosition, isActive, startTravel } = useTravel();
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routePoi, setRoutePoi] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoHere(poi: Poi) {
    if (isActive) return;
    setSelectedPoi(null);
    setLoading(true);
    const result = await fetchRoute(
      characterPosition,
      poi,
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""
    );
    setRoute(result);
    setRoutePoi(poi);
    setLoading(false);
  }

  function handleConfirmTravel() {
    if (!route || !routePoi) return;
    startTravel(routePoi, route);
    setRoute(null);
    setRoutePoi(null);
  }

  return (
    <div className="relative w-full h-full">
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

        {route && (
          <Source
            type="geojson"
            data={{ type: "Feature", properties: {}, geometry: route.geometry }}
          >
            <Layer
              id="route-line"
              type="line"
              paint={{ "line-color": "#f0e6a0", "line-width": 4, "line-opacity": 0.9 }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
          </Source>
        )}

        <PoiMarkers
          pois={POIS}
          selectedId={selectedPoi?.id ?? null}
          onSelect={setSelectedPoi}
          onGoHere={handleGoHere}
          disabled={isActive}
        />
        <CharacterMarker
          longitude={characterPosition.longitude}
          latitude={characterPosition.latitude}
        />
      </MapGL>

      {(route || loading || isActive) && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-(--surface-300) p-3">
          {loading ? (
            <p className="text-xs text-(--grey-500)">Calculating route…</p>
          ) : isActive ? (
            <p className="text-xs text-(--grey-500)">Travelling…</p>
          ) : route && routePoi ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">{routePoi.label}</p>
                <p className="text-xs text-(--grey-500)">
                  {formatDuration(route.duration)} · {formatDistance(route.distance)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirmTravel}
                className="shrink-0 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-4 py-1.5 transition-colors"
              >
                Go
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

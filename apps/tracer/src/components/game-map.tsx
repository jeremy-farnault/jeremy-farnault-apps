"use client";

import { HOME_POI, MAP_INITIAL_VIEW, POIS, TOKYO_BOUNDS, ZONE_STYLE } from "@/config/game";
import type { Poi } from "@/config/game";
import { useTravel } from "@/hooks/use-travel";
import { useZone } from "@/hooks/use-zone";
import { fetchRoute, formatDistance, formatDuration } from "@/lib/directions";
import type { RouteResult } from "@/lib/directions";
import { fetchTransitRoute } from "@/lib/transit";
import type { TransitResult } from "@/lib/transit";
import { useState } from "react";
import MapGL from "react-map-gl/mapbox";
import { Layer, Source } from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";
import { HomeMarker } from "./home-marker";
import { PoiMarkers } from "./poi-markers";
import { TerritoryZone } from "./territory-zone";

export function GameMap() {
  const { characterPosition, isActive, startTravel } = useTravel();
  const zone = useZone(process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "");
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routePoi, setRoutePoi] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<"walking" | "transit">("walking");
  const [transitRoute, setTransitRoute] = useState<TransitResult | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitUnavailable, setTransitUnavailable] = useState(false);

  async function handleGoHere(poi: Poi) {
    if (isActive) return;
    setSelectedPoi(null);
    setTravelMode("walking");
    setTransitRoute(null);
    setTransitUnavailable(false);
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

  async function handleSelectTransit() {
    setTravelMode("transit");
    if (transitRoute || transitUnavailable || !routePoi) return;
    setTransitLoading(true);
    const result = await fetchTransitRoute(characterPosition, routePoi);
    setTransitLoading(false);
    if (!result) {
      setTransitUnavailable(true);
      setTravelMode("walking");
      return;
    }
    setTransitRoute(result);
  }

  function handleConfirmTravel() {
    if (!routePoi) return;
    const activeRoute = travelMode === "transit" && transitRoute ? transitRoute : route;
    if (!activeRoute) return;
    startTravel(routePoi, activeRoute);
    setRoute(null);
    setRoutePoi(null);
    setTransitRoute(null);
    setTransitUnavailable(false);
    setTravelMode("walking");
  }

  const activeGeometry =
    travelMode === "transit" && transitRoute ? transitRoute.geometry : (route?.geometry ?? null);

  return (
    <div className="relative w-full h-full">
      <MapGL
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
        initialViewState={MAP_INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/haskkor/cmr6k3di9006x01r2erpzdftb"
        config={{ basemap: { lightPreset: "night", showRoadLabels: false } }}
        maxBounds={TOKYO_BOUNDS}
      >
        {zone && (
          <TerritoryZone
            data={zone}
            fillColor={ZONE_STYLE.fillColor}
            fillOpacity={ZONE_STYLE.fillOpacity}
            lineColor={ZONE_STYLE.lineColor}
            lineWidth={ZONE_STYLE.lineWidth}
          />
        )}

        {activeGeometry && (
          <Source
            type="geojson"
            data={{ type: "Feature", properties: {}, geometry: activeGeometry }}
          >
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#ffaf51",
                "line-width": 4,
                "line-opacity": 0.9,
                "line-emissive-strength": 1,
              }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
          </Source>
        )}

        <HomeMarker poi={HOME_POI} onGoHere={handleGoHere} disabled={isActive} />
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
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTravelMode("walking")}
                  className={`flex-1 rounded-lg text-xs font-semibold py-1 transition-colors ${
                    travelMode === "walking"
                      ? "bg-white/20 text-white"
                      : "text-(--grey-500) hover:text-white"
                  }`}
                >
                  On foot
                </button>
                {!transitUnavailable && (
                  <button
                    type="button"
                    onClick={handleSelectTransit}
                    className={`flex-1 rounded-lg text-xs font-semibold py-1 transition-colors ${
                      travelMode === "transit"
                        ? "bg-white/20 text-white"
                        : "text-(--grey-500) hover:text-white"
                    }`}
                  >
                    {transitLoading ? "…" : "Transit"}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">{routePoi.label}</p>
                  {travelMode === "walking" ? (
                    <p className="text-xs text-(--grey-500)">
                      {formatDuration(route.duration)} · {formatDistance(route.distance)}
                    </p>
                  ) : transitRoute ? (
                    <p className="text-xs text-(--grey-500)">
                      {formatDuration(transitRoute.duration)}
                      {transitRoute.fare != null && ` · ¥${transitRoute.fare}`}
                      {transitRoute.departureTime && ` · departs ${transitRoute.departureTime}`}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleConfirmTravel}
                  disabled={travelMode === "transit" && !transitRoute}
                  className="shrink-0 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 transition-colors"
                >
                  Go
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

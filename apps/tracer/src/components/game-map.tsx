"use client";

import { EXPLORE_CONFIG, ITEM_CATALOGUE, MEAL_CONFIG, WORK_CONFIG } from "@/config/economy";
import { HOME_POI, MAP_INITIAL_VIEW, POIS, TOKYO_BOUNDS, ZONE_STYLE } from "@/config/game";
import type { Poi } from "@/config/game";
import { useAction } from "@/hooks/use-action";
import { useTravel } from "@/hooks/use-travel";
import { useZone } from "@/hooks/use-zone";
import { fetchRoute, formatDistance, formatDuration } from "@/lib/directions";
import type { RouteResult } from "@/lib/directions";
import { addItem } from "@/lib/inventory";
import { fetchTransitRoute } from "@/lib/transit";
import type { TransitResult } from "@/lib/transit";
import { useCharacterStore } from "@/stores/character-store";
import { useFilterStore } from "@/stores/filter-store";
import { useRegionStore } from "@/stores/region-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";
import MapGL, { Layer, Source } from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";
import { HomeMarker } from "./home-marker";
import { PoiMarkers } from "./poi-markers";
import { TerritoryZone } from "./territory-zone";

const ACTION_LABELS: Record<string, string> = {
  meal: "Eating",
  work: "Working",
  explore: "Exploring…",
};

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PROXIMITY_THRESHOLD_M = 30;

function isNearPoi(
  pos: { longitude: number; latitude: number },
  poi: { longitude: number; latitude: number }
): boolean {
  const dlat = (pos.latitude - poi.latitude) * 111_000;
  const dlon = (pos.longitude - poi.longitude) * 91_000;
  return Math.sqrt(dlat * dlat + dlon * dlon) < PROXIMITY_THRESHOLD_M;
}

function itemEffectLabel(hungerRestore: number, thirstRestore: number): string {
  const parts: string[] = [];
  if (hungerRestore > 0) parts.push(`+${hungerRestore} hunger`);
  if (thirstRestore > 0) parts.push(`+${thirstRestore} thirst`);
  return parts.join(" · ");
}

interface GameMapProps {
  characterSelected: boolean;
  onToggleCharacter: () => void;
  onCloseCharacter: () => void;
}

export function GameMap({ characterSelected, onToggleCharacter, onCloseCharacter }: GameMapProps) {
  const { characterPosition, isActive, startTravel, travel } = useTravel();
  const money = useCharacterStore((s) => s.money);
  const spendMoney = useCharacterStore((s) => s.spendMoney);
  const restoreStats = useCharacterStore((s) => s.restoreStats);
  const earnMoney = useCharacterStore((s) => s.earnMoney);
  const discoveredRegionIds = useRegionStore((s) => s.discoveredRegionIds);
  const enabledCategories = useFilterStore((s) => s.enabledCategories);
  const enabledLines = useFilterStore((s) => s.enabledLines);
  const pendingSelectionId = useSelectionStore((s) => s.pendingSelectionId);
  const clearPending = useSelectionStore((s) => s.clearPending);
  const mapRef = useRef<MapRef | null>(null);
  const { action, t, startAction, stopAction } = useAction((finalT, state) => {
    if (state.type === "meal") {
      restoreStats(Math.floor(finalT * state.maxStatA), Math.floor(finalT * state.maxStatB));
    } else if (state.type === "work") {
      earnMoney(Math.floor(finalT * state.maxStatA));
    } else if (state.type === "explore" && finalT === 1 && state.unlocksRegionId) {
      useRegionStore.getState().discover(state.unlocksRegionId);
    }
  });
  const zone = useZone(process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "");
  const [shopOpen, setShopOpen] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routePoi, setRoutePoi] = useState<Poi | null>(null);
  const [loading, setLoading] = useState(false);
  const [travelMode, setTravelMode] = useState<"walking" | "transit">("walking");
  const [transitRoute, setTransitRoute] = useState<TransitResult | null>(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitUnavailable, setTransitUnavailable] = useState(false);

  function clearRouteContext() {
    setRoute(null);
    setRoutePoi(null);
    setTransitRoute(null);
    setTransitUnavailable(false);
    setTravelMode("walking");
  }

  function selectPoi(poi: Poi | null) {
    if (poi?.id !== routePoi?.id) clearRouteContext();
    setSelectedPoi(poi);
  }

  async function handleGoHere(poi: Poi) {
    if (isActive || action) return;
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

  function handleShop(_poi: Poi) {
    setSelectedPoi(null);
    setShopOpen(true);
  }

  function handleWork(_poi: Poi) {
    setSelectedPoi(null);
    startAction({
      type: "work",
      duration: WORK_CONFIG.shiftDuration,
      prepaidCost: 0,
      maxStatA: WORK_CONFIG.maxEarnings,
      maxStatB: 0,
    });
  }

  function handleEat(_poi: Poi) {
    setSelectedPoi(null);
    if (!spendMoney(MEAL_CONFIG.cost)) return;
    startAction({
      type: "meal",
      duration: MEAL_CONFIG.duration,
      prepaidCost: MEAL_CONFIG.cost,
      maxStatA: MEAL_CONFIG.maxHungerRestore,
      maxStatB: MEAL_CONFIG.maxThirstRestore,
    });
  }

  function handleExplore(p: Poi) {
    if (p.category !== "station") return;
    setSelectedPoi(null);
    startAction({
      type: "explore",
      duration: EXPLORE_CONFIG.duration,
      prepaidCost: 0,
      maxStatA: 0,
      maxStatB: 0,
      unlocksRegionId: p.unlocksRegionId,
    });
  }

  function handleConfirmTravel() {
    if (!routePoi) return;
    const activeRoute = travelMode === "transit" && transitRoute ? transitRoute : route;
    if (!activeRoute) return;
    startTravel(routePoi, activeRoute);
    clearRouteContext();
  }

  const activeGeometry =
    travelMode === "transit" && transitRoute ? transitRoute.geometry : (route?.geometry ?? null);

  const visiblePois = POIS.filter((p) => {
    // Home is rendered separately by HomeMarker.
    if (p.category === "home") return false;
    // Always show goal POIs (Enoshima).
    if (p.category === "goal") return true;
    // Non-station POIs require region discovery.
    if (p.category !== "station" && !discoveredRegionIds.includes(p.regionId)) return false;
    // Station filter: category gate, then line intersection.
    if (p.category === "station") {
      if (!enabledCategories.includes("station")) return false;
      if (p.lines.length === 0) return true;
      return p.lines.some((l) => enabledLines.includes(l));
    }
    return enabledCategories.includes(p.category);
  });

  const nearSelected = selectedPoi ? isNearPoi(characterPosition, selectedPoi) : false;
  const canAct = !isActive && !action && nearSelected && selectedPoi !== null;
  const poiAction: {
    label: "Shop" | "Eat" | "Work" | "Explore";
    handler: (p: Poi) => void;
  } | null = (() => {
    if (!canAct || !selectedPoi) return null;
    if (selectedPoi.category === "konbini") return { label: "Shop", handler: handleShop };
    if (selectedPoi.category === "ramen" && money >= MEAL_CONFIG.cost)
      return { label: "Eat", handler: handleEat };
    if (selectedPoi.category === "work") return { label: "Work", handler: handleWork };
    if (selectedPoi.category === "station") return { label: "Explore", handler: handleExplore };
    return null;
  })();

  useEffect(() => {
    if (!pendingSelectionId) return;
    const poi = POIS.find((p) => p.id === pendingSelectionId);
    if (!poi) {
      clearPending();
      return;
    }
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [poi.longitude, poi.latitude],
        zoom: Math.max(map.getZoom(), 16),
      });
    }
    setSelectedPoi(poi);
    clearPending();
  }, [pendingSelectionId, clearPending]);

  return (
    <div className="relative w-full h-full">
      <MapGL
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
        initialViewState={MAP_INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/haskkor/cmr6k3di9006x01r2erpzdftb"
        config={{ basemap: { lightPreset: "night", showRoadLabels: false } }}
        maxBounds={TOKYO_BOUNDS}
        onClick={onCloseCharacter}
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

        {characterSelected && travel?.routeGeometry && (
          <Source
            type="geojson"
            data={{ type: "Feature", properties: {}, geometry: travel.routeGeometry }}
          >
            <Layer
              id="active-travel-line"
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

        <HomeMarker
          poi={HOME_POI}
          open={selectedPoi?.id === HOME_POI.id}
          onToggle={() => selectPoi(selectedPoi?.id === HOME_POI.id ? null : HOME_POI)}
          onClose={() => selectPoi(null)}
          onGoHere={handleGoHere}
          disabled={isActive || !!action}
        />
        <PoiMarkers
          pois={visiblePois}
          selectedId={selectedPoi?.id ?? null}
          onSelect={selectPoi}
          onGoHere={handleGoHere}
          {...(poiAction ? { onAction: poiAction.handler, actionLabel: poiAction.label } : {})}
          disabled={isActive || !!action}
        />
        <CharacterMarker
          longitude={characterPosition.longitude}
          latitude={characterPosition.latitude}
          onClick={onToggleCharacter}
        />
      </MapGL>

      {shopOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-80 rounded-xl bg-(--surface-200)/95 backdrop-blur-sm border border-(--surface-300) p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">🏪 Konbini</p>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="text-xs text-(--grey-500) hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {ITEM_CATALOGUE.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.emoji}</span>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-(--grey-500)">
                        {itemEffectLabel(item.hungerRestore, item.thirstRestore)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={money < item.price}
                    onClick={() => {
                      if (spendMoney(item.price)) addItem(item.id);
                    }}
                    className="shrink-0 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1 transition-colors"
                  >
                    ¥{item.price}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-(--grey-500) text-right tabular-nums">
              Balance: ¥{money.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {action && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-(--surface-300) p-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">
                {ACTION_LABELS[action.type] ?? action.type}
              </p>
              <p className="text-xs text-(--grey-500) tabular-nums">
                {formatMMSS(Math.round(t * action.duration))} / {formatMMSS(action.duration)}
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-1000"
                style={{ width: `${t * 100}%` }}
              />
            </div>
            {action.type === "work" && (
              <p className="text-xs text-(--grey-500) tabular-nums">
                ¥{Math.floor(t * WORK_CONFIG.maxEarnings).toLocaleString()} earned
              </p>
            )}
            <button
              type="button"
              onClick={() => stopAction()}
              className="self-end rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-4 py-1.5 transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

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

"use client";

import { ITEM_CATALOGUE, MEAL_CONFIG, WORK_CONFIG } from "@/config/economy";
import { HOME_POI, MAP_INITIAL_VIEW, POIS, TOKYO_BOUNDS, ZONE_STYLE } from "@/config/game";
import type { Poi } from "@/config/game";
import { useAction } from "@/hooks/use-action";
import { useStats } from "@/hooks/use-stats";
import { useTravel } from "@/hooks/use-travel";
import { useZone } from "@/hooks/use-zone";
import { fetchRoute, formatDistance, formatDuration } from "@/lib/directions";
import type { RouteResult } from "@/lib/directions";
import { addItem } from "@/lib/inventory";
import { fetchTransitRoute } from "@/lib/transit";
import type { TransitResult } from "@/lib/transit";
import { useState } from "react";
import MapGL from "react-map-gl/mapbox";
import { Layer, Source } from "react-map-gl/mapbox";
import { CharacterMarker } from "./character-marker";
import { HomeMarker } from "./home-marker";
import { PoiMarkers } from "./poi-markers";
import { TerritoryZone } from "./territory-zone";

const ACTION_LABELS: Record<string, string> = {
  meal: "Eating",
  work: "Working",
};

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const KONBINI_POI = POIS.find((p) => p.category === "konbini");
const RAMEN_POI = POIS.find((p) => p.category === "ramen");
const WORK_POI = POIS.find((p) => p.category === "work");
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

export function GameMap() {
  const { characterPosition, isActive, startTravel } = useTravel();
  const { stats, spendMoney, restoreStats, earnMoney } = useStats();
  const { action, t, startAction, stopAction } = useAction((finalT, state) => {
    if (state.type === "meal") {
      restoreStats(Math.floor(finalT * state.maxStatA), Math.floor(finalT * state.maxStatB));
    } else if (state.type === "work") {
      earnMoney(Math.floor(finalT * state.maxStatA));
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

        <HomeMarker poi={HOME_POI} onGoHere={handleGoHere} disabled={isActive || !!action} />
        <PoiMarkers
          pois={POIS}
          selectedId={selectedPoi?.id ?? null}
          onSelect={setSelectedPoi}
          onGoHere={handleGoHere}
          {...(KONBINI_POI && !isActive && !action && isNearPoi(characterPosition, KONBINI_POI)
            ? { onShop: handleShop }
            : {})}
          {...(RAMEN_POI &&
          !isActive &&
          !action &&
          stats.money >= MEAL_CONFIG.cost &&
          isNearPoi(characterPosition, RAMEN_POI)
            ? { onEat: handleEat }
            : {})}
          {...(WORK_POI && !isActive && !action && isNearPoi(characterPosition, WORK_POI)
            ? { onWork: handleWork }
            : {})}
          disabled={isActive || !!action}
        />
        <CharacterMarker
          longitude={characterPosition.longitude}
          latitude={characterPosition.latitude}
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
                    disabled={stats.money < item.price}
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
              Balance: ¥{stats.money.toLocaleString()}
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

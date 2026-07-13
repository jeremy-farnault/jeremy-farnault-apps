"use client";

import type { Poi } from "@/config/game";
import { useClusteredPois } from "@/hooks/use-clustered-pois";
import { useEffect } from "react";
import { Marker, Popup, useMap } from "react-map-gl/mapbox";

interface Props {
  pois: Poi[];
  selectedId: string | null;
  onSelect: (poi: Poi | null) => void;
  onGoHere: (poi: Poi) => void;
  onAction?: (poi: Poi) => void;
  actionLabel?: "Shop" | "Eat" | "Work" | "Explore";
  disabled?: boolean;
}

function clusterSize(count: number): string {
  if (count < 10) return "w-9 h-9 text-xs";
  if (count < 100) return "w-11 h-11 text-sm";
  return "w-14 h-14 text-base";
}

export function PoiMarkers({
  pois,
  selectedId,
  onSelect,
  onGoHere,
  onAction,
  actionLabel,
  disabled,
}: Props) {
  const items = useClusteredPois(pois);
  const { current: map } = useMap();
  const selected = pois.find((p) => p.id === selectedId) ?? null;

  // Auto-close popup when the selected POI is absorbed into a cluster (no
  // longer rendered individually).
  useEffect(() => {
    if (!selectedId) return;
    const stillVisible = items.some((it) => it.type === "point" && it.poi.id === selectedId);
    if (!stillVisible) onSelect(null);
  }, [items, selectedId, onSelect]);

  return (
    <>
      {items.map((item) => {
        if (item.type === "cluster") {
          return (
            <Marker
              key={`cluster-${item.id}`}
              longitude={item.longitude}
              latitude={item.latitude}
              anchor="center"
            >
              <button
                type="button"
                className={`flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-white font-semibold tabular-nums select-none ${clusterSize(item.count)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  map?.flyTo({
                    center: [item.longitude, item.latitude],
                    zoom: item.expansionZoom,
                  });
                }}
              >
                {item.count}
              </button>
            </Marker>
          );
        }

        const poi = item.poi;
        return (
          <Marker key={poi.id} longitude={poi.longitude} latitude={poi.latitude} anchor="bottom">
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 cursor-pointer text-base select-none"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(poi.id === selectedId ? null : poi);
              }}
            >
              {poi.emoji}
            </button>
          </Marker>
        );
      })}

      {selected && (
        <Popup
          longitude={selected.longitude}
          latitude={selected.latitude}
          anchor="bottom"
          offset={40}
          onClose={() => onSelect(null)}
          closeButton={false}
          closeOnClick={true}
          className="tracer-popup"
        >
          <div className="flex flex-col gap-2 p-1 min-w-32">
            <div>
              <p className="text-sm font-semibold text-white">{selected.label}</p>
              <p className="text-xs text-white/50 capitalize">{selected.category}</p>
            </div>
            {onAction && actionLabel && (
              <button
                type="button"
                onClick={() => onAction(selected)}
                className="w-full rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-1.5 transition-colors"
              >
                {actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => !disabled && onGoHere(selected)}
              disabled={disabled}
              className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 transition-colors"
            >
              Go here
            </button>
          </div>
        </Popup>
      )}
    </>
  );
}

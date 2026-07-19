"use client";

import type { Poi } from "@/config/game";
import { useClusteredPois } from "@/hooks/use-clustered-pois";
import { useEffect } from "react";
import { Marker, useMap } from "react-map-gl/mapbox";

interface Props {
  pois: Poi[];
  selectedId: string | null;
  onSelect: (poi: Poi | null) => void;
}

function clusterSize(count: number): string {
  if (count < 10) return "w-9 h-9 text-xs";
  if (count < 100) return "w-11 h-11 text-sm";
  return "w-14 h-14 text-base";
}

export function PoiMarkers({ pois, selectedId, onSelect }: Props) {
  const items = useClusteredPois(pois);
  const { current: map } = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const inCorpus = pois.some((p) => p.id === selectedId);
    if (!inCorpus) return;
    const stillIndividual = items.some((it) => it.type === "point" && it.poi.id === selectedId);
    if (!stillIndividual) onSelect(null);
  }, [items, selectedId, onSelect, pois]);

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
    </>
  );
}

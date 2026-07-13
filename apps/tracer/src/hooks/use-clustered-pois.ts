"use client";

import type { Poi } from "@/config/game";
import { useMapViewport } from "@/hooks/use-map-viewport";
import { useMemo } from "react";
import Supercluster from "supercluster";

export type ClusteredItem =
  | { type: "point"; poi: Poi }
  | {
      type: "cluster";
      id: number;
      longitude: number;
      latitude: number;
      count: number;
      expansionZoom: number;
    };

type PoiProps = { poiId: string };

export function useClusteredPois(pois: Poi[]): ClusteredItem[] {
  const { zoom, bbox } = useMapViewport();

  // Rebuild the supercluster index only when the set of POI ids meaningfully
  // changes. `pois` is a fresh .filter() array each render — depending on its
  // identity would rebuild every frame.
  const key = pois.map((p) => p.id).join(",");

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — `key` captures the ids we care about; rebuilding on every `pois` identity change would defeat the memo.
  const { index, byId } = useMemo(() => {
    const idx = new Supercluster<PoiProps>({ radius: 40, maxZoom: 14 });
    const features: GeoJSON.Feature<GeoJSON.Point, PoiProps>[] = pois.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: { poiId: p.id },
    }));
    idx.load(features);
    const map = new Map<string, Poi>();
    for (const p of pois) map.set(p.id, p);
    return { index: idx, byId: map };
  }, [key]);

  const clusters = useMemo(() => {
    const raw = index.getClusters(bbox, Math.floor(zoom));
    return raw.map((c): ClusteredItem => {
      const lon = c.geometry.coordinates[0] ?? 0;
      const lat = c.geometry.coordinates[1] ?? 0;
      const props = c.properties as
        | (PoiProps & { cluster?: false })
        | { cluster: true; cluster_id: number; point_count: number };
      if ("cluster" in props && props.cluster === true) {
        return {
          type: "cluster",
          id: props.cluster_id,
          longitude: lon,
          latitude: lat,
          count: props.point_count,
          expansionZoom: Math.min(index.getClusterExpansionZoom(props.cluster_id), 20),
        };
      }
      const poi = byId.get((props as PoiProps).poiId);
      if (!poi) {
        // Shouldn't happen; skip defensively.
        return {
          type: "cluster",
          id: -1,
          longitude: lon,
          latitude: lat,
          count: 0,
          expansionZoom: 0,
        };
      }
      return { type: "point", poi };
    });
  }, [index, byId, bbox, zoom]);

  return clusters;
}

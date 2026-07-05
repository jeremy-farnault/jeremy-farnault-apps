"use client";

import { INITIAL_ZONE } from "@/config/game";
import { fetchRoute } from "@/lib/directions";
import type { Feature, Polygon } from "geojson";
import { useEffect, useState } from "react";

export function useZone(token: string): Feature<Polygon> | null {
  const [zone, setZone] = useState<Feature<Polygon> | null>(null);

  useEffect(() => {
    const corners = (INITIAL_ZONE.geometry.coordinates[0] ?? []).slice(0, -1) as [number, number][];

    async function build() {
      const legs = await Promise.all(
        corners.map((corner, i) => {
          const next = corners[(i + 1) % corners.length] as [number, number];
          return fetchRoute(
            { longitude: corner[0], latitude: corner[1] },
            { longitude: next[0], latitude: next[1] },
            token
          );
        })
      );

      if (legs.some((leg) => leg === null)) return;

      const ring: [number, number][] = [];
      for (const leg of legs as NonNullable<(typeof legs)[0]>[]) {
        ring.push(...(leg.geometry.coordinates.slice(0, -1) as [number, number][]));
      }
      ring.push(ring[0] as [number, number]);

      setZone({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      });
    }

    build();
  }, [token]);

  return zone;
}

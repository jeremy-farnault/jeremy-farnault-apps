"use client";

import type { Feature, MultiPolygon, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/mapbox";

interface Props {
  data: Feature<Polygon | MultiPolygon>;
  fillColor: string;
  fillOpacity: number;
  lineColor: string;
  lineWidth: number;
}

export function TerritoryZone({ data, fillColor, fillOpacity, lineColor, lineWidth }: Props) {
  return (
    <Source type="geojson" data={data}>
      <Layer
        id="territory-fill"
        type="fill"
        paint={{
          "fill-color": fillColor,
          "fill-opacity": fillOpacity,
          "fill-emissive-strength": 1,
        }}
      />
      <Layer
        id="territory-line"
        type="line"
        paint={{ "line-color": lineColor, "line-width": lineWidth, "line-emissive-strength": 1 }}
      />
    </Source>
  );
}

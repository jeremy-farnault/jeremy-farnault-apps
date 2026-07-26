"use client";

import type { Feature, MultiPolygon, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/mapbox";

interface Props {
  id: string;
  data: Feature<Polygon | MultiPolygon>;
  fillColor: string;
  fillOpacity: number;
  lineColor: string;
  lineWidth: number;
}

export function TerritoryZone({ id, data, fillColor, fillOpacity, lineColor, lineWidth }: Props) {
  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={`${id}-fill`}
        type="fill"
        paint={{
          "fill-color": fillColor,
          "fill-opacity": fillOpacity,
          "fill-emissive-strength": 1,
        }}
      />
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{ "line-color": lineColor, "line-width": lineWidth, "line-emissive-strength": 1 }}
      />
    </Source>
  );
}

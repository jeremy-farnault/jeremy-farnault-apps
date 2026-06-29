"use client";

import type { Feature, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/mapbox";

interface Props {
  data: Feature<Polygon>;
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
        paint={{ "fill-color": fillColor, "fill-opacity": fillOpacity }}
      />
      <Layer
        id="territory-line"
        type="line"
        paint={{ "line-color": lineColor, "line-width": lineWidth }}
      />
    </Source>
  );
}

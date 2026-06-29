import type { Feature, Polygon } from "geojson";

export const PLAYER_HOME = {
  longitude: 139.72691,
  latitude: 35.76988,
};

export const MAP_INITIAL_VIEW = {
  ...PLAYER_HOME,
  zoom: 15,
};

// ~50m box around PLAYER_HOME
export const INITIAL_ZONE: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [139.72636, 35.76943],
        [139.72746, 35.76943],
        [139.72746, 35.77033],
        [139.72636, 35.77033],
        [139.72636, 35.76943],
      ],
    ],
  },
};

export const ZONE_STYLE = {
  fillColor: "#b63a3a",
  fillOpacity: 0.15,
  lineColor: "#b63a3a",
  lineWidth: 2,
};

// Stub — ticket 04
export const POIS: {
  id: string;
  longitude: number;
  latitude: number;
  category: string;
}[] = [];

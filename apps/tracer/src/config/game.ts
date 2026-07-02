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

export type Poi = {
  id: string;
  label: string;
  category: string;
  emoji: string;
  longitude: number;
  latitude: number;
};

export const TOKYO_BOUNDS: [[number, number], [number, number]] = [
  [138.9, 35.18], // SW: west of Hachioji, south of Kamakura
  [140.25, 36.05], // NE: eastern Chiba, northern Saitama
];

export const POIS: Poi[] = [
  {
    id: "konbini-1",
    label: "Konbini",
    category: "konbini",
    emoji: "🏪",
    longitude: 139.725766,
    latitude: 35.771305,
  },
  {
    id: "school-1",
    label: "School",
    category: "school",
    emoji: "🏫",
    longitude: 139.725207,
    latitude: 35.771495,
  },
  {
    id: "sento-1",
    label: "Sento",
    category: "sento",
    emoji: "♨️",
    longitude: 139.730235,
    latitude: 35.772475,
  },
  {
    id: "shrine-1",
    label: "Shrine",
    category: "shrine",
    emoji: "⛩️",
    longitude: 139.730431,
    latitude: 35.769946,
  },
  {
    id: "izakaya-1",
    label: "Izakaya",
    category: "izakaya",
    emoji: "🍺",
    longitude: 139.72573081730215,
    latitude: 35.76925278459695,
  },
];

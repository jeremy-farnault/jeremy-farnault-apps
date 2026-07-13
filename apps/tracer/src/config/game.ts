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
  fillColor: "#44a684",
  fillOpacity: 0.4,
  lineColor: "#44a684",
  lineWidth: 2,
};

export type Region = {
  id: string;
  label: string;
};

export const REGIONS = [
  { id: "home", label: "Home" },
  { id: "enoshima", label: "Enoshima" },
  { id: "akabane", label: "Akabane" },
] as const satisfies readonly Region[];

export type RegionId = (typeof REGIONS)[number]["id"];

export type PoiCategory =
  | "konbini"
  | "school"
  | "sento"
  | "shrine"
  | "izakaya"
  | "goal"
  | "ramen"
  | "work"
  | "home"
  | "station";

type PoiBase = {
  id: string;
  label: string;
  emoji: string;
  longitude: number;
  latitude: number;
  regionId: RegionId;
};

export type StationPoi = PoiBase & {
  category: "station";
  unlocksRegionId: RegionId;
};

export type GenericPoi = PoiBase & {
  category: Exclude<PoiCategory, "station">;
};

export type Poi = StationPoi | GenericPoi;

export const HOME_POI: Poi = {
  id: "home",
  label: "Home",
  category: "home",
  emoji: "🏠",
  longitude: PLAYER_HOME.longitude,
  latitude: PLAYER_HOME.latitude,
  regionId: "home",
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
    regionId: "home",
  },
  {
    id: "school-1",
    label: "School",
    category: "school",
    emoji: "🏫",
    longitude: 139.725207,
    latitude: 35.771495,
    regionId: "home",
  },
  {
    id: "sento-1",
    label: "Sento",
    category: "sento",
    emoji: "♨️",
    longitude: 139.730235,
    latitude: 35.772475,
    regionId: "home",
  },
  {
    id: "shrine-1",
    label: "Shrine",
    category: "shrine",
    emoji: "⛩️",
    longitude: 139.730431,
    latitude: 35.769946,
    regionId: "home",
  },
  {
    id: "izakaya-1",
    label: "Izakaya",
    category: "izakaya",
    emoji: "🍺",
    longitude: 139.72573081730215,
    latitude: 35.76925278459695,
    regionId: "home",
  },
  {
    id: "enoshima-1",
    label: "Enoshima",
    category: "goal",
    emoji: "⭐",
    longitude: 139.482599,
    latitude: 35.298836,
    regionId: "enoshima",
  },
  {
    id: "ramen-1",
    label: "Ramen Shop",
    category: "ramen",
    emoji: "🍜",
    longitude: 139.7295015281104,
    latitude: 35.7680562405046,
    regionId: "home",
  },
  {
    id: "work-1",
    label: "Work",
    category: "work",
    emoji: "💼",
    longitude: 139.71261092278013,
    latitude: 35.76842945297194,
    regionId: "home",
  },
  {
    id: "station-akabane",
    label: "Akabane Station",
    category: "station",
    emoji: "🚉",
    longitude: 139.7197,
    latitude: 35.7778,
    regionId: "akabane",
    unlocksRegionId: "akabane",
  },
  {
    id: "konbini-akabane",
    label: "Konbini",
    category: "konbini",
    emoji: "🏪",
    longitude: 139.721,
    latitude: 35.7783,
    regionId: "akabane",
  },
  {
    id: "ramen-akabane",
    label: "Ramen Shop",
    category: "ramen",
    emoji: "🍜",
    longitude: 139.7195,
    latitude: 35.777,
    regionId: "akabane",
  },
  {
    id: "work-akabane",
    label: "Work",
    category: "work",
    emoji: "💼",
    longitude: 139.718,
    latitude: 35.7785,
    regionId: "akabane",
  },
];

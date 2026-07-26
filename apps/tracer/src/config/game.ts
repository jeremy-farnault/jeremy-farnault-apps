import type { LineId } from "@/config/lines";
import { STATION_POIS } from "@/config/stations";
export { REGIONS } from "@/config/regions";
export type { Region, RegionId } from "@/config/regions";
import type { RegionId } from "@/config/regions";

export const PLAYER_HOME = {
  longitude: 139.72691,
  latitude: 35.76988,
};

export const MAP_INITIAL_VIEW = {
  ...PLAYER_HOME,
  zoom: 15,
};

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
  | "station"
  | "gym"
  | "dojo"
  | "npc";

export type PoiBase = {
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
  lines: LineId[];
};

export type Job = {
  knowledgeThreshold: number;
  ratePerHour: number;
  shiftDuration: number; // seconds
};

export type WorkPoi = PoiBase & {
  category: "work";
  job: Job;
};

export type GenericPoi = PoiBase & {
  category: Exclude<PoiCategory, "station" | "work">;
};

export type Poi = StationPoi | WorkPoi | GenericPoi;

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
    job: { knowledgeThreshold: 0, ratePerHour: 1200, shiftDuration: 28800 },
  },
  {
    id: "gym-1",
    label: "Gym",
    category: "gym",
    emoji: "💪",
    longitude: 139.72661788819428,
    latitude: 35.766232588642,
    regionId: "home",
  },
  {
    id: "dojo-1",
    label: "Dojo",
    category: "dojo",
    emoji: "🥋",
    longitude: 139.71089243818213,
    latitude: 35.77094210736899,
    regionId: "home",
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
    job: { knowledgeThreshold: 0, ratePerHour: 1200, shiftDuration: 28800 },
  },
  ...STATION_POIS,
];

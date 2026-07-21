import type { StationId } from "@/config/stations";

// A single fare zone. `fareTiers` on an operator is an array of these sorted
// ascending by `maxDistanceKm`. Lookup for a ridden distance D: find the first
// tier where `maxDistanceKm >= D` (inclusive) and use its `fareYen`. If D
// exceeds the last tier, use the last tier's fareYen (capped, no extrapolation).
export type FareTier = { maxDistanceKm: number; fareYen: number };

export type Operator = {
  id: string;
  label: string;
  // Fare to board this operator's network — used directly as the transit
  // simulation's transfer-edge weight when transferring from a different
  // operator. Conventionally equals `fareTiers[0].fareYen`; kept as a distinct
  // field so the transfer code reads naturally.
  baseFareYen: number;
  fareTiers: readonly FareTier[];
};

export const OPERATORS = [
  {
    id: "jr-east",
    label: "JR East",
    baseFareYen: 140,
    fareTiers: [
      { maxDistanceKm: 3, fareYen: 140 },
      { maxDistanceKm: 6, fareYen: 170 },
      { maxDistanceKm: 10, fareYen: 200 },
      { maxDistanceKm: 15, fareYen: 240 },
      { maxDistanceKm: 20, fareYen: 320 },
      { maxDistanceKm: 100, fareYen: 550 },
    ],
  },
  {
    id: "tokyo-metro",
    label: "Tokyo Metro",
    baseFareYen: 170,
    fareTiers: [
      { maxDistanceKm: 6, fareYen: 170 },
      { maxDistanceKm: 11, fareYen: 200 },
      { maxDistanceKm: 15, fareYen: 240 },
      { maxDistanceKm: 100, fareYen: 290 },
    ],
  },
  {
    id: "toei",
    label: "Toei",
    baseFareYen: 180,
    fareTiers: [
      { maxDistanceKm: 4, fareYen: 180 },
      { maxDistanceKm: 8, fareYen: 220 },
      { maxDistanceKm: 12, fareYen: 280 },
      { maxDistanceKm: 100, fareYen: 320 },
    ],
  },
  {
    id: "tokyu",
    label: "Tokyu",
    baseFareYen: 140,
    fareTiers: [
      { maxDistanceKm: 3, fareYen: 140 },
      { maxDistanceKm: 7, fareYen: 170 },
      { maxDistanceKm: 15, fareYen: 210 },
      { maxDistanceKm: 100, fareYen: 270 },
    ],
  },
  {
    id: "odakyu",
    label: "Odakyu Electric Railway",
    baseFareYen: 140,
    fareTiers: [
      { maxDistanceKm: 3, fareYen: 140 },
      { maxDistanceKm: 6, fareYen: 160 },
      { maxDistanceKm: 10, fareYen: 190 },
      { maxDistanceKm: 15, fareYen: 220 },
      { maxDistanceKm: 25, fareYen: 310 },
      { maxDistanceKm: 40, fareYen: 480 },
      { maxDistanceKm: 60, fareYen: 660 },
      { maxDistanceKm: 80, fareYen: 900 },
      { maxDistanceKm: 100, fareYen: 900 },
    ],
  },
  {
    id: "enoden",
    label: "Enoshima Electric Railway",
    baseFareYen: 260,
    // Every line under this operator uses `fare: { kind: "flat" }` today,
    // so these tiers are effectively unreached; kept as a sensible fallback
    // in case a non-flat line is ever added under this operator.
    fareTiers: [{ maxDistanceKm: 100, fareYen: 260 }],
  },
] as const satisfies readonly Operator[];

export type OperatorId = (typeof OPERATORS)[number]["id"];

export type Line = {
  id: string;
  label: string;
  code: string;
  color: string;
  operator: OperatorId;
  // Average travelling speed. Used to derive per-segment ride duration in the
  // transit simulation: (segmentKm / avgSpeedKmh) * 3600 + intermediate stops.
  avgSpeedKmh: number;
  // Present and true only for loop lines (Yamanote). Absence ≡ non-loop.
  // When true, graph construction adds a wrap-around edge between the last
  // and first station in `LINE_STATION_ORDER`.
  isLoop?: boolean;
  // Overrides the operator's tiered fare for this line. Absence ≡ use the
  // operator's `fareTiers`. Discriminated on `kind` so future non-flat
  // variants (e.g. "peak-adjusted") plug in without breaking callers.
  fare?: { kind: "flat"; yen: number };
};

export const LINES = [
  {
    id: "yamanote",
    label: "Yamanote Line",
    code: "JY",
    color: "#9ACD32",
    operator: "jr-east",
    avgSpeedKmh: 30,
    isLoop: true,
  },
  {
    id: "keihin-tohoku",
    label: "Keihin-Tohoku Line",
    code: "JK",
    color: "#00B2E5",
    operator: "jr-east",
    avgSpeedKmh: 35,
  },
  {
    id: "saikyo",
    label: "Saikyo Line",
    code: "JA",
    color: "#00AC9B",
    operator: "jr-east",
    avgSpeedKmh: 40,
  },
  {
    id: "namboku",
    label: "Namboku Line",
    code: "N",
    color: "#00AC84",
    operator: "tokyo-metro",
    avgSpeedKmh: 35,
  },
  {
    id: "den-en-toshi",
    label: "Den-en-toshi Line",
    code: "DT",
    color: "#F39700",
    operator: "tokyu",
    avgSpeedKmh: 40,
  },
  {
    id: "chuo-rapid",
    label: "Chuo Rapid Line",
    code: "JC",
    color: "#F15A22",
    operator: "jr-east",
    avgSpeedKmh: 60,
  },
  {
    id: "marunouchi",
    label: "Marunouchi Line",
    code: "M",
    color: "#F62E36",
    operator: "tokyo-metro",
    avgSpeedKmh: 32,
  },
  {
    id: "ginza",
    label: "Ginza Line",
    code: "G",
    color: "#F39700",
    operator: "tokyo-metro",
    avgSpeedKmh: 28,
  },
  {
    id: "odakyu-odawara",
    label: "Odakyu Odawara Line",
    code: "OH",
    color: "#005AAA",
    operator: "odakyu",
    avgSpeedKmh: 45,
  },
  {
    id: "enoden",
    label: "Enoshima Electric Railway",
    code: "EN",
    color: "#008C41",
    operator: "enoden",
    avgSpeedKmh: 22,
    fare: { kind: "flat", yen: 260 },
  },
] as const satisfies readonly Line[];

export type LineId = (typeof LINES)[number]["id"];

// Ordered station sequences per line. Each line maps to one or more sequences
// of station IDs in a canonical direction (typically north-to-south, west-to-
// east, or clockwise for loops). Order derives *undirected* adjacency only —
// station N is adjacent to N-1 and N+1 on that line; direction of travel is
// resolved by the routing algorithm.
//
// Invariants:
// - Every station whose `lines[]` includes L appears in `LINE_STATION_ORDER[L]`
//   at least once.
// - Only station IDs already present in `STATION_POIS` are referenced (enforced
//   by the `StationId` type).
// - Loop lines (`isLoop: true` on the Line) are a single sequence, and the
//   graph-build step adds the wrap-around edge between the last and first
//   station. Do NOT double-list the terminus.
// - Branching lines have multiple sequences; branch sequences start at the
//   mainline junction station so the graph inherits both directions of travel
//   from that station.
export const LINE_STATION_ORDER = {
  yamanote: [
    [
      "station-shinagawa",
      "station-takanawa-gateway",
      "station-tamachi",
      "station-hamamatsucho",
      "station-shinbashi",
      "station-yurakucho",
      "station-tokyo",
      "station-kanda",
      "station-akihabara",
      "station-okachimachi",
      "station-ueno",
      "station-uguisudani",
      "station-nippori",
      "station-nishi-nippori",
      "station-tabata",
      "station-komagome",
      "station-sugamo",
      "station-otsuka",
      "station-ikebukuro",
      "station-mejiro",
      "station-takadanobaba",
      "station-shin-okubo",
      "station-shinjuku",
      "station-yoyogi",
      "station-harajuku",
      "station-shibuya",
      "station-ebisu",
      "station-meguro",
      "station-gotanda",
      "station-osaki",
    ],
  ],
  "keihin-tohoku": [
    [
      "station-omiya",
      "station-saitama-shintoshin",
      "station-yono",
      "station-kita-urawa",
      "station-urawa",
      "station-minami-urawa",
      "station-warabi",
      "station-nishi-kawaguchi",
      "station-kawaguchi",
      "station-akabane",
      "station-higashi-jujo",
      "station-oji",
      "station-kami-nakazato",
      "station-tabata",
      "station-nishi-nippori",
      "station-nippori",
      "station-uguisudani",
      "station-ueno",
      "station-okachimachi",
      "station-akihabara",
      "station-kanda",
      "station-tokyo",
      "station-yurakucho",
      "station-shinbashi",
      "station-hamamatsucho",
      "station-tamachi",
      "station-takanawa-gateway",
      "station-shinagawa",
      "station-oimachi",
      "station-omori",
      "station-kamata",
      "station-kawasaki",
      "station-tsurumi",
      "station-shin-koyasu",
      "station-higashi-kanagawa",
      "station-yokohama",
      "station-sakuragicho",
      "station-kannai",
      "station-ishikawacho",
      "station-yamate",
      "station-negishi",
      "station-isogo",
      "station-shin-sugita",
      "station-yokodai",
      "station-konandai",
      "station-ofuna",
    ],
  ],
  saikyo: [
    [
      "station-osaki",
      "station-ebisu",
      "station-shibuya",
      "station-shinjuku",
      "station-ikebukuro",
      "station-itabashi",
      "station-jujo",
      "station-akabane",
      "station-kita-akabane",
      "station-ukima-funado",
      "station-toda-koen",
      "station-toda",
      "station-kita-toda",
      "station-musashi-urawa",
      "station-naka-urawa",
      "station-minami-yono",
      "station-yono-honmachi",
      "station-kita-yono",
      "station-omiya",
    ],
  ],
  namboku: [
    [
      "station-meguro",
      "station-shirokanedai",
      "station-shirokane-takanawa",
      "station-azabu-juban",
      "station-roppongi-itchome",
      "station-tameike-sanno",
      "station-nagatacho",
      "station-yotsuya",
      "station-ichigaya",
      "station-iidabashi",
      "station-korakuen",
      "station-todaimae",
      "station-hon-komagome",
      "station-komagome",
      "station-nishigahara",
      "station-oji",
      "station-oji-kamiya",
      "station-shimo",
      "station-akabane-iwabuchi",
    ],
  ],
  "den-en-toshi": [
    [
      "station-shibuya",
      "station-ikejiri-ohashi",
      "station-sangen-jaya",
      "station-komazawa-daigaku",
      "station-sakura-shinmachi",
      "station-yoga",
      "station-futako-tamagawa",
      "station-futako-shinchi",
      "station-takatsu",
      "station-mizonokuchi",
      "station-kajigaya",
      "station-miyazakidai",
      "station-miyamaedaira",
      "station-saginuma",
      "station-tama-plaza",
      "station-azamino",
      "station-eda",
      "station-ichigao",
      "station-fujigaoka",
      "station-aobadai",
      "station-tana",
      "station-nagatsuta",
      "station-tsukushino",
      "station-suzukakedai",
      "station-minami-machida-grandberry-park",
      "station-tsukimino",
      "station-chuo-rinkan",
    ],
  ],
  "chuo-rapid": [
    [
      "station-tokyo",
      "station-kanda",
      "station-ochanomizu",
      "station-yotsuya",
      "station-shinjuku",
      "station-nakano",
      "station-koenji",
      "station-asagaya",
      "station-ogikubo",
      "station-nishi-ogikubo",
      "station-kichijoji",
      "station-mitaka",
      "station-musashi-sakai",
      "station-higashi-koganei",
      "station-musashi-koganei",
      "station-kokubunji",
      "station-nishi-kokubunji",
      "station-kunitachi",
      "station-tachikawa",
      "station-hino",
      "station-toyoda",
      "station-hachioji",
      "station-nishi-hachioji",
      "station-takao",
    ],
  ],
  marunouchi: [
    [
      "station-ogikubo",
      "station-minami-asagaya",
      "station-shin-koenji",
      "station-higashi-koenji",
      "station-shin-nakano",
      "station-nakano-sakaue",
      "station-nishi-shinjuku",
      "station-shinjuku",
      "station-shinjuku-sanchome",
      "station-shinjuku-gyoemmae",
      "station-yotsuya-sanchome",
      "station-yotsuya",
      "station-akasaka-mitsuke",
      "station-kokkai-gijidomae",
      "station-kasumigaseki",
      "station-ginza",
      "station-tokyo",
      "station-otemachi",
      "station-awajicho",
      "station-ochanomizu",
      "station-hongo-sanchome",
      "station-korakuen",
      "station-myogadani",
      "station-shin-otsuka",
      "station-ikebukuro",
    ],
    // Honancho branch — starts at Nakano-Sakaue (junction with mainline).
    [
      "station-nakano-sakaue",
      "station-nakano-shimbashi",
      "station-nakano-fujimicho",
      "station-honancho",
    ],
  ],
  ginza: [
    [
      "station-shibuya",
      "station-omotesando",
      "station-gaiemmae",
      "station-aoyama-itchome",
      "station-akasaka-mitsuke",
      "station-tameike-sanno",
      "station-toranomon",
      "station-shinbashi",
      "station-ginza",
      "station-kyobashi",
      "station-nihombashi",
      "station-mitsukoshimae",
      "station-kanda",
      "station-suehirocho",
      "station-ueno-hirokoji",
      "station-ueno",
      "station-inaricho",
      "station-tawaramachi",
      "station-asakusa",
    ],
  ],
  "odakyu-odawara": [
    [
      "station-shinjuku",
      "station-minami-shinjuku",
      "station-sangubashi",
      "station-yoyogi-hachiman",
      "station-yoyogi-uehara",
      "station-higashi-kitazawa",
      "station-shimo-kitazawa",
      "station-setagaya-daita",
      "station-umegaoka",
      "station-gotokuji",
      "station-kyodo",
      "station-chitose-funabashi",
      "station-soshigaya-okura",
      "station-seijogakuen-mae",
      "station-kitami",
      "station-komae",
      "station-izumi-tamagawa",
      "station-noborito",
      "station-mukogaoka-yuen",
      "station-ikuta",
      "station-yomiuriland-mae",
      "station-yurigaoka",
      "station-shin-yurigaoka",
      "station-kakio",
      "station-tsurukawa",
      "station-tamagawagakuen-mae",
      "station-machida",
      "station-sagami-ono",
      "station-odakyu-sagamihara",
      "station-sobudaimae",
      "station-ebina",
      "station-atsugi",
      "station-hon-atsugi",
      "station-isehara",
      "station-tsurumaki-onsen",
      "station-tokaidaigaku-mae",
      "station-hadano",
      "station-shibusawa",
      "station-shin-matsuda",
      "station-kaisei",
      "station-odawara",
    ],
    // Enoshima branch — starts at Sagami-Ono (junction with mainline).
    [
      "station-sagami-ono",
      "station-higashi-rinkan",
      "station-chogo",
      "station-kozashibuya",
      "station-zengyo",
      "station-fujisawa-hommachi",
      "station-fujisawa",
      "station-honkugenuma",
      "station-katase-enoshima",
    ],
  ],
  enoden: [
    [
      "station-fujisawa",
      "station-ishigami",
      "station-yanagikoji",
      "station-kugenuma",
      "station-shonan-kaigan-koen",
      "station-enoshima",
      "station-koshigoe",
      "station-kamakura-koko-mae",
      "station-shichirigahama",
      "station-inamuragasaki",
      "station-gokurakuji",
      "station-hase",
      "station-yuigahama",
      "station-wadazuka",
      "station-kamakura",
    ],
  ],
} as const satisfies Record<LineId, readonly (readonly StationId[])[]>;

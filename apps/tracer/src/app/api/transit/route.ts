import { LINES, type LineId, type OperatorId } from "@/config/lines";
import { STATION_POIS } from "@/config/stations";
import { fetchRoute } from "@/lib/directions";
import {
  type RideChain,
  computeFareYen,
  computeTransitLegs,
  nearestStation,
} from "@/lib/transit-sim";
import { type NextRequest, NextResponse } from "next/server";

type TransitLegPoint = { latitude: number; longitude: number; label: string };

type TransitLeg = {
  kind: "walk" | "ride" | "transfer";
  from: TransitLegPoint;
  to: TransitLegPoint;
  line?: LineId;
  stopCount?: number;
  durationSec: number;
  distanceMeters: number;
  fareYen: number;
  coordinates: [number, number][];
};

type TransitPlan = {
  legs: TransitLeg[];
  totalDurationSec: number;
  totalDistanceMeters: number;
  totalFareYen: number;
};

type ApiResponse = { best: TransitPlan; alternative: TransitPlan } | TransitPlan | null;

function parseLatLng(s: string | null): { latitude: number; longitude: number } | null {
  if (!s) return null;
  const parts = s.split(",");
  if (parts.length !== 2) return null;
  const lat = Number.parseFloat(parts[0] ?? "");
  const lng = Number.parseFloat(parts[1] ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function stationById(id: string) {
  return STATION_POIS.find((s) => s.id === id);
}

function lineOperator(id: LineId): OperatorId | undefined {
  return LINES.find((l) => l.id === id)?.operator;
}

function buildWalkLeg(
  walk: { geometry: { coordinates: [number, number][] }; duration: number; distance: number },
  from: TransitLegPoint,
  to: TransitLegPoint
): TransitLeg {
  return {
    kind: "walk",
    from,
    to,
    durationSec: walk.duration,
    distanceMeters: walk.distance,
    fareYen: 0,
    coordinates: walk.geometry.coordinates,
  };
}

function buildPlan(chain: RideChain, walkIn: TransitLeg, walkOut: TransitLeg): TransitPlan {
  // Attribute each operator's tier fare to the first ride leg using that operator;
  // subsequent same-operator ride legs contribute 0 so the sum matches
  // chain.totalFareYen (which is computeFareYen(chain.perOperatorKm)).
  const perOpFare: Partial<Record<OperatorId, number>> = {};
  for (const [op, km] of Object.entries(chain.perOperatorKm)) {
    if (!km || km <= 0) continue;
    perOpFare[op as OperatorId] = computeFareYen({ [op]: km } as Partial<
      Record<OperatorId, number>
    >);
  }
  const billed = new Set<OperatorId>();

  const legs: TransitLeg[] = [walkIn];

  for (const seg of chain.segments) {
    if (seg.kind === "ride") {
      const from = stationById(seg.from);
      const to = stationById(seg.to);
      if (!from || !to) continue;
      const op = lineOperator(seg.line);
      let fareYen = 0;
      if (op && !billed.has(op)) {
        fareYen = perOpFare[op] ?? 0;
        billed.add(op);
      }
      const coordinates = seg.stationsPassed
        .map((sid) => stationById(sid))
        .filter((s): s is (typeof STATION_POIS)[number] => !!s)
        .map((s) => [s.longitude, s.latitude] as [number, number]);
      legs.push({
        kind: "ride",
        from: { latitude: from.latitude, longitude: from.longitude, label: from.label },
        to: { latitude: to.latitude, longitude: to.longitude, label: to.label },
        line: seg.line,
        stopCount: Math.max(0, seg.stationsPassed.length - 1),
        durationSec: seg.durationSec,
        distanceMeters: seg.distanceKm * 1000,
        fareYen,
        coordinates,
      });
    } else {
      const at = stationById(seg.at);
      if (!at) continue;
      legs.push({
        kind: "transfer",
        from: { latitude: at.latitude, longitude: at.longitude, label: at.label },
        to: { latitude: at.latitude, longitude: at.longitude, label: at.label },
        durationSec: seg.durationSec,
        distanceMeters: 0,
        fareYen: 0,
        coordinates: [],
      });
    }
  }

  legs.push(walkOut);

  const totalDurationSec = legs.reduce((s, l) => s + l.durationSec, 0);
  const totalDistanceMeters = legs.reduce((s, l) => s + l.distanceMeters, 0);
  return {
    legs,
    totalDurationSec,
    totalDistanceMeters,
    totalFareYen: chain.totalFareYen,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const { searchParams } = request.nextUrl;
  const originStr = searchParams.get("origin");
  const destinationStr = searchParams.get("destination");

  const origin = parseLatLng(originStr);
  const destination = parseLatLng(destinationStr);
  if (!origin || !destination) {
    return NextResponse.json(null, { status: 400 });
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    return NextResponse.json(null, { status: 503 });
  }

  if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
    return NextResponse.json(null);
  }

  const originStation = nearestStation(origin.latitude, origin.longitude);
  const destStation = nearestStation(destination.latitude, destination.longitude);
  if (!originStation || !destStation) {
    return NextResponse.json(null);
  }

  if (originStation.id === destStation.id) {
    return NextResponse.json(null);
  }

  const [walkIn, walkOut] = await Promise.all([
    fetchRoute(
      { longitude: origin.longitude, latitude: origin.latitude },
      { longitude: originStation.longitude, latitude: originStation.latitude },
      mapboxToken
    ),
    fetchRoute(
      { longitude: destStation.longitude, latitude: destStation.latitude },
      { longitude: destination.longitude, latitude: destination.latitude },
      mapboxToken
    ),
  ]);
  if (!walkIn || !walkOut) {
    return NextResponse.json(null);
  }

  const chainResult = computeTransitLegs(originStation.id, destStation.id);
  if (!chainResult) {
    return NextResponse.json(null);
  }

  const walkInLeg = buildWalkLeg(
    walkIn,
    {
      latitude: origin.latitude,
      longitude: origin.longitude,
      label: "Current location",
    },
    {
      latitude: originStation.latitude,
      longitude: originStation.longitude,
      label: originStation.label,
    }
  );
  const walkOutLeg = buildWalkLeg(
    walkOut,
    {
      latitude: destStation.latitude,
      longitude: destStation.longitude,
      label: destStation.label,
    },
    { latitude: destination.latitude, longitude: destination.longitude, label: "Destination" }
  );

  if ("fastest" in chainResult) {
    const best = buildPlan(chainResult.fastest, walkInLeg, walkOutLeg);
    const alternative = buildPlan(chainResult.cheapest, walkInLeg, walkOutLeg);
    // Only surface the alternative when it's strictly cheaper than best.
    // Otherwise the "cheapest" Dijkstra approximation has produced a route
    // that isn't actually cheaper — collapse to a single Best plan rather
    // than lie in the UI.
    if (alternative.totalFareYen < best.totalFareYen) {
      return NextResponse.json({ best, alternative });
    }
    return NextResponse.json(best);
  }

  const plan = buildPlan(chainResult, walkInLeg, walkOutLeg);
  return NextResponse.json(plan);
}

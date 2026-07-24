import type { Poi } from "@/config/game";
import type { LineId } from "@/config/lines";

export type TransitLegPoint = { latitude: number; longitude: number; label: string };

export type TransitLeg = {
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

export type TransitPlan = {
  legs: TransitLeg[];
  totalDurationSec: number;
  totalDistanceMeters: number;
  totalFareYen: number;
};

export type TransitApiResponse =
  | { best: TransitPlan; alternative: TransitPlan }
  | TransitPlan
  | null;

export async function fetchTransitRoute(
  from: { longitude: number; latitude: number },
  to: Poi
): Promise<TransitApiResponse> {
  const origin = `${from.latitude},${from.longitude}`;
  const destination = `${to.latitude},${to.longitude}`;
  const url = `/api/transit?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body: TransitApiResponse = await res.json();
  return body;
}

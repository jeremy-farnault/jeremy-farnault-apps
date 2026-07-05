import polyline from "@mapbox/polyline";
import { type NextRequest, NextResponse } from "next/server";

type GoogleStep = {
  travel_mode: string;
  transit_details?: { line: { name: string } };
};

type GoogleLeg = {
  duration: { value: number };
  distance: { value: number };
  departure_time?: { text: string };
  steps: GoogleStep[];
};

type GoogleRoute = {
  overview_polyline: { points: string };
  legs: GoogleLeg[];
  fare?: { value: number };
};

type GoogleDirectionsResponse = { status: string; routes: GoogleRoute[] };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  if (!origin || !destination) return NextResponse.json(null, { status: 400 });

  const apiKey = process.env.GOOGLE_MAPS_KEY;
  if (!apiKey) return NextResponse.json(null, { status: 503 });

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=transit&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return NextResponse.json(null);

  const data: GoogleDirectionsResponse = await res.json();
  if (data.status !== "OK" || !data.routes[0]) return NextResponse.json(null);

  const route = data.routes[0];
  const leg = route?.legs[0];
  if (!leg) return NextResponse.json(null);

  const decoded = polyline.decode(route.overview_polyline.points);
  const coordinates: [number, number][] = decoded.map(([lat, lng]) => [lng, lat]);
  const transitStep = leg.steps.find((s) => s.travel_mode === "TRANSIT");

  return NextResponse.json({
    geometry: { type: "LineString", coordinates },
    duration: leg.duration.value,
    distance: leg.distance.value,
    fare: route.fare?.value ?? null,
    departureTime: leg.departure_time?.text ?? null,
    lineSummary: transitStep?.transit_details?.line.name ?? null,
  });
}

export type TransitResult = {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  duration: number;
  distance: number;
  fare: number | null;
  departureTime: string | null;
  lineSummary: string | null;
};

export async function fetchTransitRoute(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number }
): Promise<TransitResult | null> {
  const origin = `${from.latitude},${from.longitude}`;
  const destination = `${to.latitude},${to.longitude}`;
  const res = await fetch(`/api/transit?origin=${origin}&destination=${destination}`);
  if (!res.ok) return null;
  return res.json();
}

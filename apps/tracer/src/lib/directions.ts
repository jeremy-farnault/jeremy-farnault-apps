const BASE = "https://api.mapbox.com/directions/v5/mapbox/walking";

type DirectionsRoute = {
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  duration: number;
  distance: number;
};

type DirectionsResponse = {
  routes: DirectionsRoute[];
};

export type RouteResult = {
  geometry: DirectionsRoute["geometry"];
  duration: number;
  distance: number;
};

export async function fetchRoute(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
  token: string
): Promise<RouteResult | null> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${BASE}/${coords}?geometries=geojson&overview=full&exclude=ferry&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: DirectionsResponse = await res.json();
  const route = data.routes[0];
  if (!route) return null;
  return { geometry: route.geometry, duration: route.duration, distance: route.distance };
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return mins < 1 ? "< 1 min" : `${mins} min`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

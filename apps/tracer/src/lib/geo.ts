import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

type LngLat = { longitude: number; latitude: number };

// Planar approximation of ground distance in meters, accurate at neighborhood
// scale (hundreds of meters) at Tokyo's latitude (~35.7°N): 1° latitude ≈ 111 km,
// 1° longitude ≈ 91 km (111 km × cos 35.7°).
export function distanceMeters(a: LngLat, b: LngLat): number {
  const dlat = (a.latitude - b.latitude) * 111_000;
  const dlon = (a.longitude - b.longitude) * 91_000;
  return Math.sqrt(dlat * dlat + dlon * dlon);
}

// Ray-casting point-in-polygon over a GeoJSON Polygon/MultiPolygon boundary.
// Tests outer rings only (our zone boundaries have no holes).
export function pointInPolygon(point: LngLat, boundary: Feature<Polygon | MultiPolygon>): boolean {
  const polygons: Position[][][] =
    boundary.geometry.type === "Polygon"
      ? [boundary.geometry.coordinates]
      : boundary.geometry.coordinates;
  for (const polygon of polygons) {
    const ring = polygon[0];
    if (ring && ringContains(ring, point.longitude, point.latitude)) return true;
  }
  return false;
}

function ringContains(ring: Position[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const xi = a[0];
    const yi = a[1];
    const xj = b[0];
    const yj = b[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

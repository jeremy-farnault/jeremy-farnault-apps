const BASE_SIZE = 64;
const REF_ZOOM = 15;
const MIN_SIZE = 24;
const MAX_SIZE = 64;

export function sizeForZoom(zoom: number): number {
  if (zoom === 0) return BASE_SIZE; // sentinel: map not yet mounted
  const raw = BASE_SIZE * 2 ** ((zoom - REF_ZOOM) * 0.5);
  return Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, raw)));
}

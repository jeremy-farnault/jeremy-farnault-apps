import { LINES, LINE_STATION_ORDER, type LineId, OPERATORS, type OperatorId } from "@/config/lines";
import { STATION_POIS, type StationId } from "@/config/stations";

// Stop time at each intermediate station along a ride leg.
export const DWELL_TIME_SECONDS = 30;

// Flat penalty added when changing lines at a station.
export const TRANSFER_TIME_SECONDS = 240;

// Fare in yen for a trip where the total distance ridden on each operator's
// network is provided (already summed per operator by the caller — a JR East
// leg on Yamanote plus a JR East leg on Keihin-Tohoku should be passed as
// their sum, not two separate entries).
//
// Tier lookup: for each operator's distance D, walk `fareTiers` ascending and
// return the first tier where `maxDistanceKm >= D`. If D exceeds the last
// tier, use the last tier's fare (capped, no extrapolation).
//
// Zero, negative, or missing distances contribute ¥0. The total is the sum
// across operators.
export function computeFareYen(perOperatorDistanceKm: Partial<Record<OperatorId, number>>): number {
  let total = 0;
  for (const operator of OPERATORS) {
    const km = perOperatorDistanceKm[operator.id];
    if (km === undefined || km <= 0) continue;
    const tier =
      operator.fareTiers.find((t) => t.maxDistanceKm >= km) ??
      operator.fareTiers[operator.fareTiers.length - 1];
    if (tier) total += tier.fareYen;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Station-line graph
// ─────────────────────────────────────────────────────────────────────────────

type GraphEdge = { readonly to: StationId; readonly line: LineId; readonly distanceKm: number };

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const STATION_INDEX: ReadonlyMap<StationId, (typeof STATION_POIS)[number]> = new Map(
  STATION_POIS.map((s) => [s.id, s])
);

const LINE_INDEX: ReadonlyMap<LineId, (typeof LINES)[number]> = new Map(
  LINES.map((l) => [l.id, l])
);

const OPERATOR_INDEX: ReadonlyMap<OperatorId, (typeof OPERATORS)[number]> = new Map(
  OPERATORS.map((o) => [o.id, o])
);

const OPERATOR_BIT: ReadonlyMap<OperatorId, number> = new Map(
  OPERATORS.map((o, i) => [o.id, 1 << i])
);

const GRAPH: ReadonlyMap<StationId, readonly GraphEdge[]> = (() => {
  const adj = new Map<StationId, GraphEdge[]>();
  const addEdge = (a: StationId, b: StationId, line: LineId) => {
    const sa = STATION_INDEX.get(a);
    const sb = STATION_INDEX.get(b);
    if (!sa || !sb) return;
    const d = haversineKm(sa, sb);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, line, distanceKm: d });
    adj.get(b)!.push({ to: a, line, distanceKm: d });
  };
  for (const line of LINES) {
    const sequences = LINE_STATION_ORDER[line.id];
    for (const seq of sequences) {
      for (let i = 0; i < seq.length - 1; i++) {
        addEdge(seq[i]!, seq[i + 1]!, line.id);
      }
      if ("isLoop" in line && line.isLoop && seq.length > 1) {
        addEdge(seq[seq.length - 1]!, seq[0]!, line.id);
      }
    }
  }
  // Freeze inner arrays.
  const frozen = new Map<StationId, readonly GraphEdge[]>();
  for (const [k, v] of adj) frozen.set(k, Object.freeze(v));
  return frozen;
})();

/** Nearest station in `STATION_POIS` to the given lat/lng, via linear-scan haversine. */
export function nearestStation(
  latitude: number,
  longitude: number
): (typeof STATION_POIS)[number] | null {
  let best: (typeof STATION_POIS)[number] | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const s of STATION_POIS) {
    const d = haversineKm({ latitude, longitude }, s);
    if (d < bestKm) {
      bestKm = d;
      best = s;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Min-heap (binary) — small, dependency-free
// ─────────────────────────────────────────────────────────────────────────────

class MinHeap<T> {
  private data: { p: number; v: T }[] = [];
  push(priority: number, value: T): void {
    this.data.push({ p: priority, v: value });
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent]!.p <= this.data[i]!.p) break;
      [this.data[parent], this.data[i]] = [this.data[i]!, this.data[parent]!];
      i = parent;
    }
  }
  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0]!.v;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (i < n) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let s = i;
        if (l < n && this.data[l]!.p < this.data[s]!.p) s = l;
        if (r < n && this.data[r]!.p < this.data[s]!.p) s = r;
        if (s === i) break;
        [this.data[s], this.data[i]] = [this.data[i]!, this.data[s]!];
        i = s;
      }
    }
    return top;
  }
  size(): number {
    return this.data.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dijkstra — fastest and cheapest passes
// ─────────────────────────────────────────────────────────────────────────────

type BoardEdge = { kind: "board"; line: LineId };
type RideEdge = { kind: "ride"; line: LineId; distanceKm: number };
type TransferEdge = { kind: "transfer"; fromLine: LineId; toLine: LineId };
type PathEdge = BoardEdge | RideEdge | TransferEdge;

type PredecessorEntry = {
  prevKey: string | null;
  edge: PathEdge;
  station: StationId;
  arrivedLine: LineId;
};

function stateKeyFastest(s: StationId, line: LineId): string {
  return `${s}|${line}`;
}

function stateKeyCheapest(s: StationId, line: LineId, ops: number): string {
  return `${s}|${line}|${ops}`;
}

function baseFareOf(line: LineId): number {
  const l = LINE_INDEX.get(line);
  if (!l) return 0;
  return OPERATOR_INDEX.get(l.operator)?.baseFareYen ?? 0;
}

function operatorBit(line: LineId): number {
  const l = LINE_INDEX.get(line);
  if (!l) return 0;
  return OPERATOR_BIT.get(l.operator) ?? 0;
}

function dijkstraFastest(origin: StationId, destination: StationId): PredecessorEntry[] | null {
  const heap = new MinHeap<{ key: string; station: StationId; arrivedLine: LineId }>();
  const preds = new Map<string, PredecessorEntry>();
  const bestSec = new Map<string, number>();

  const originAdj = GRAPH.get(origin);
  if (!originAdj) return null;
  const seededLines = new Set<LineId>();
  for (const e of originAdj) {
    if (seededLines.has(e.line)) continue;
    seededLines.add(e.line);
    const key = stateKeyFastest(origin, e.line);
    bestSec.set(key, 0);
    preds.set(key, {
      prevKey: null,
      edge: { kind: "board", line: e.line },
      station: origin,
      arrivedLine: e.line,
    });
    heap.push(0, { key, station: origin, arrivedLine: e.line });
  }

  while (heap.size() > 0) {
    const cur = heap.pop()!;
    if (cur.station === destination) {
      return reconstruct(cur.key, preds);
    }
    const curSec = bestSec.get(cur.key)!;
    const adj = GRAPH.get(cur.station);
    if (!adj) continue;

    // Ride edges (continue on current line).
    for (const edge of adj) {
      if (edge.line !== cur.arrivedLine) continue;
      const line = LINE_INDEX.get(edge.line);
      if (!line) continue;
      const rideSec = (edge.distanceKm / line.avgSpeedKmh) * 3600;
      const newSec = curSec + rideSec;
      const newKey = stateKeyFastest(edge.to, edge.line);
      if (newSec < (bestSec.get(newKey) ?? Number.POSITIVE_INFINITY)) {
        bestSec.set(newKey, newSec);
        preds.set(newKey, {
          prevKey: cur.key,
          edge: { kind: "ride", line: edge.line, distanceKm: edge.distanceKm },
          station: edge.to,
          arrivedLine: edge.line,
        });
        heap.push(newSec, { key: newKey, station: edge.to, arrivedLine: edge.line });
      }
    }

    // Transfer edges (same station, different line).
    const linesHere = new Set<LineId>();
    for (const e of adj) linesHere.add(e.line);
    linesHere.delete(cur.arrivedLine);
    for (const otherLine of linesHere) {
      const newSec = curSec + TRANSFER_TIME_SECONDS;
      const newKey = stateKeyFastest(cur.station, otherLine);
      if (newSec < (bestSec.get(newKey) ?? Number.POSITIVE_INFINITY)) {
        bestSec.set(newKey, newSec);
        preds.set(newKey, {
          prevKey: cur.key,
          edge: { kind: "transfer", fromLine: cur.arrivedLine, toLine: otherLine },
          station: cur.station,
          arrivedLine: otherLine,
        });
        heap.push(newSec, { key: newKey, station: cur.station, arrivedLine: otherLine });
      }
    }
  }

  return null;
}

function dijkstraCheapest(origin: StationId, destination: StationId): PredecessorEntry[] | null {
  const heap = new MinHeap<{
    key: string;
    station: StationId;
    arrivedLine: LineId;
    ops: number;
  }>();
  const preds = new Map<string, PredecessorEntry>();
  const bestYen = new Map<string, number>();

  const originAdj = GRAPH.get(origin);
  if (!originAdj) return null;
  const seededLines = new Set<LineId>();
  for (const e of originAdj) {
    if (seededLines.has(e.line)) continue;
    seededLines.add(e.line);
    const ops = operatorBit(e.line);
    const initial = baseFareOf(e.line);
    const key = stateKeyCheapest(origin, e.line, ops);
    bestYen.set(key, initial);
    preds.set(key, {
      prevKey: null,
      edge: { kind: "board", line: e.line },
      station: origin,
      arrivedLine: e.line,
    });
    heap.push(initial, { key, station: origin, arrivedLine: e.line, ops });
  }

  while (heap.size() > 0) {
    const cur = heap.pop()!;
    if (cur.station === destination) {
      return reconstruct(cur.key, preds);
    }
    const curYen = bestYen.get(cur.key)!;
    const adj = GRAPH.get(cur.station);
    if (!adj) continue;

    // Ride edges.
    for (const edge of adj) {
      if (edge.line !== cur.arrivedLine) continue;
      const opBit = operatorBit(edge.line);
      const marginal = (cur.ops & opBit) !== 0 ? 0 : baseFareOf(edge.line);
      const newOps = cur.ops | opBit;
      const newYen = curYen + marginal;
      const newKey = stateKeyCheapest(edge.to, edge.line, newOps);
      if (newYen < (bestYen.get(newKey) ?? Number.POSITIVE_INFINITY)) {
        bestYen.set(newKey, newYen);
        preds.set(newKey, {
          prevKey: cur.key,
          edge: { kind: "ride", line: edge.line, distanceKm: edge.distanceKm },
          station: edge.to,
          arrivedLine: edge.line,
        });
        heap.push(newYen, {
          key: newKey,
          station: edge.to,
          arrivedLine: edge.line,
          ops: newOps,
        });
      }
    }

    // Transfer edges.
    const linesHere = new Set<LineId>();
    for (const e of adj) linesHere.add(e.line);
    linesHere.delete(cur.arrivedLine);
    for (const otherLine of linesHere) {
      const opBit = operatorBit(otherLine);
      const marginal = (cur.ops & opBit) !== 0 ? 0 : baseFareOf(otherLine);
      const newOps = cur.ops | opBit;
      const newYen = curYen + marginal;
      const newKey = stateKeyCheapest(cur.station, otherLine, newOps);
      if (newYen < (bestYen.get(newKey) ?? Number.POSITIVE_INFINITY)) {
        bestYen.set(newKey, newYen);
        preds.set(newKey, {
          prevKey: cur.key,
          edge: { kind: "transfer", fromLine: cur.arrivedLine, toLine: otherLine },
          station: cur.station,
          arrivedLine: otherLine,
        });
        heap.push(newYen, {
          key: newKey,
          station: cur.station,
          arrivedLine: otherLine,
          ops: newOps,
        });
      }
    }
  }

  return null;
}

function reconstruct(
  endKey: string,
  preds: ReadonlyMap<string, PredecessorEntry>
): PredecessorEntry[] {
  const chain: PredecessorEntry[] = [];
  let k: string | null = endKey;
  while (k !== null) {
    const entry = preds.get(k);
    if (!entry) break;
    chain.push(entry);
    k = entry.prevKey;
  }
  chain.reverse();
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coalesce hop-by-hop chain into segments
// ─────────────────────────────────────────────────────────────────────────────

export type RideSegment = {
  kind: "ride";
  line: LineId;
  from: StationId;
  to: StationId;
  stationsPassed: readonly StationId[];
  distanceKm: number;
  durationSec: number;
};

export type TransferSegment = {
  kind: "transfer";
  at: StationId;
  fromLine: LineId;
  toLine: LineId;
  durationSec: number;
};

export type Segment = RideSegment | TransferSegment;

export type RideChain = {
  segments: readonly Segment[];
  totalDistanceKm: number;
  totalDurationSec: number;
  totalFareYen: number;
  perOperatorKm: Partial<Record<OperatorId, number>>;
};

function coalesce(chain: PredecessorEntry[]): RideChain {
  const segments: Segment[] = [];
  const perOpKm: Partial<Record<OperatorId, number>> = {};
  let totalDistanceKm = 0;
  let totalDurationSec = 0;

  // Running accumulator for the current ride segment.
  let current: { line: LineId; stations: StationId[]; distanceKm: number } | null = null;

  const flushRide = () => {
    if (!current || current.stations.length < 2) {
      current = null;
      return;
    }
    const line = LINE_INDEX.get(current.line);
    if (!line) {
      current = null;
      return;
    }
    const intermediates = Math.max(0, current.stations.length - 2);
    const rideSec =
      (current.distanceKm / line.avgSpeedKmh) * 3600 + intermediates * DWELL_TIME_SECONDS;
    segments.push({
      kind: "ride",
      line: current.line,
      from: current.stations[0]!,
      to: current.stations[current.stations.length - 1]!,
      stationsPassed: [...current.stations],
      distanceKm: current.distanceKm,
      durationSec: rideSec,
    });
    totalDistanceKm += current.distanceKm;
    totalDurationSec += rideSec;
    perOpKm[line.operator] = (perOpKm[line.operator] ?? 0) + current.distanceKm;
    current = null;
  };

  for (const entry of chain) {
    if (entry.edge.kind === "board") {
      current = { line: entry.edge.line, stations: [entry.station], distanceKm: 0 };
    } else if (entry.edge.kind === "ride") {
      if (current && current.line === entry.edge.line) {
        current.stations.push(entry.station);
        current.distanceKm += entry.edge.distanceKm;
      } else {
        // Should not happen — a ride edge is only reachable while on that line.
        flushRide();
        current = {
          line: entry.edge.line,
          stations: [entry.station],
          distanceKm: entry.edge.distanceKm,
        };
      }
    } else {
      // Transfer.
      flushRide();
      segments.push({
        kind: "transfer",
        at: entry.station,
        fromLine: entry.edge.fromLine,
        toLine: entry.edge.toLine,
        durationSec: TRANSFER_TIME_SECONDS,
      });
      totalDurationSec += TRANSFER_TIME_SECONDS;
      current = { line: entry.edge.toLine, stations: [entry.station], distanceKm: 0 };
    }
  }
  flushRide();

  return {
    segments,
    totalDistanceKm,
    totalDurationSec,
    totalFareYen: computeFareYen(perOpKm),
    perOperatorKm: perOpKm,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapse check + public API
// ─────────────────────────────────────────────────────────────────────────────

function chainsMatchStructurally(a: RideChain, b: RideChain): boolean {
  if (a.segments.length !== b.segments.length) return false;
  for (let i = 0; i < a.segments.length; i++) {
    const sa = a.segments[i]!;
    const sb = b.segments[i]!;
    if (sa.kind !== sb.kind) return false;
    if (sa.kind === "ride" && sb.kind === "ride") {
      if (sa.line !== sb.line || sa.from !== sb.from || sa.to !== sb.to) return false;
    } else if (sa.kind === "transfer" && sb.kind === "transfer") {
      if (sa.at !== sb.at || sa.fromLine !== sb.fromLine || sa.toLine !== sb.toLine) return false;
    }
  }
  return true;
}

/**
 * Compute the ride+transfer chain between two stations, returning both a
 * fastest-time and a cheapest-fare plan. If both passes produce structurally
 * identical plans, returns a single `RideChain` instead.
 *
 * Returns `null` when origin === destination, or when Dijkstra can't reach
 * the destination (disconnected graph — shouldn't happen with the current
 * network but defensive).
 */
export function computeTransitLegs(
  origin: StationId,
  destination: StationId
): { fastest: RideChain; cheapest: RideChain } | RideChain | null {
  if (origin === destination) return null;
  const fastestChain = dijkstraFastest(origin, destination);
  const cheapestChain = dijkstraCheapest(origin, destination);
  if (!fastestChain || !cheapestChain) return null;
  const fastest = coalesce(fastestChain);
  const cheapest = coalesce(cheapestChain);
  if (chainsMatchStructurally(fastest, cheapest)) return fastest;
  return { fastest, cheapest };
}

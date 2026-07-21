import { describe, expect, it } from "vitest";
import { type RideChain, computeFareYen, computeTransitLegs } from "./transit-sim";

describe("computeFareYen", () => {
  it("returns 0 for empty input", () => {
    expect(computeFareYen({})).toBe(0);
  });

  it("hits the first tier for a short single-operator trip", () => {
    // JR East fareTiers[0] = { maxDistanceKm: 3, fareYen: 140 }
    expect(computeFareYen({ "jr-east": 2 })).toBe(140);
  });

  it("caps at the last tier for a distance beyond the fare table", () => {
    // JR East top tier = { maxDistanceKm: 100, fareYen: 550 }.
    // 500 km exceeds the last tier → still ¥550, no extrapolation.
    expect(computeFareYen({ "jr-east": 500 })).toBe(550);
  });

  it("sums across operators additively", () => {
    // JR East at 5 km → second tier ¥170.
    // Tokyo Metro at 5 km → first tier ¥170.
    // Total ¥340.
    expect(computeFareYen({ "jr-east": 5, "tokyo-metro": 5 })).toBe(340);
  });

  it("treats Enoden as flat regardless of distance", () => {
    // Enoden's single-tier operator config yields ¥260 for any positive km.
    expect(computeFareYen({ enoden: 0.5 })).toBe(260);
    expect(computeFareYen({ enoden: 3 })).toBe(260);
    expect(computeFareYen({ enoden: 10 })).toBe(260);
  });

  it("contributes 0 for zero or negative distances", () => {
    expect(computeFareYen({ "jr-east": 0 })).toBe(0);
    expect(computeFareYen({ "jr-east": -1 })).toBe(0);
  });
});

// Helper: unwrap the discriminated result — for these tests we know each
// case either collapses or produces both.
function unwrapPlans(result: ReturnType<typeof computeTransitLegs>): {
  fastest: RideChain;
  cheapest: RideChain;
} {
  if (result === null) throw new Error("expected a plan, got null");
  if ("fastest" in result) return result;
  return { fastest: result, cheapest: result };
}

describe("computeTransitLegs", () => {
  it("returns null when origin equals destination", () => {
    expect(computeTransitLegs("station-shinjuku", "station-shinjuku")).toBeNull();
  });

  it("computes a single same-line ride (Akabane → Ikebukuro on Saikyo)", () => {
    const plans = unwrapPlans(computeTransitLegs("station-akabane", "station-ikebukuro"));
    // Segment shape: at least one ride, at least one station passed.
    expect(plans.fastest.segments.length).toBeGreaterThanOrEqual(1);
    expect(plans.fastest.totalDistanceKm).toBeGreaterThan(0);
    expect(plans.fastest.totalDurationSec).toBeGreaterThan(0);
    // Both plans exist (may be collapsed).
    expect(plans.cheapest.totalFareYen).toBeGreaterThan(0);
  });

  it("handles a single JR-internal transfer (Higashi-Jujo → Itabashi via Akabane)", () => {
    const plans = unwrapPlans(computeTransitLegs("station-higashi-jujo", "station-itabashi"));
    // The transit path requires transferring at Akabane between Keihin-Tohoku and Saikyo.
    const kinds = plans.fastest.segments.map((s) => s.kind);
    expect(kinds).toContain("transfer");
    // Both segments belong to JR East → single-operator fare.
    expect(Object.keys(plans.fastest.perOperatorKm)).toEqual(["jr-east"]);
  });

  it("handles a cross-operator transfer (Shibuya → Roppongi-Itchome)", () => {
    const plans = unwrapPlans(computeTransitLegs("station-shibuya", "station-roppongi-itchome"));
    // Path must have at least one transfer (Shibuya doesn't serve Namboku directly).
    expect(plans.fastest.segments.some((s) => s.kind === "transfer")).toBe(true);
    // Cheapest correctly finds a Tokyo-Metro-only path (Ginza → Tameike-Sanno →
    // Namboku), so it pays just one operator's base fare (¥170).
    expect(plans.cheapest.totalFareYen).toBe(170);
  });

  it("finds a plausible route across the map (Shinjuku → Ueno)", () => {
    const plans = unwrapPlans(computeTransitLegs("station-shinjuku", "station-ueno"));
    // Path exists and ride segments cover the ~7km distance without wandering.
    expect(plans.fastest.totalDistanceKm).toBeGreaterThan(0);
    expect(plans.fastest.totalDistanceKm).toBeLessThan(20);
    // Fastest may use a faster line + transfer (Chuo Rapid → Yamanote) rather
    // than the slow Yamanote loop — just verify the algorithm doesn't loop
    // around the wrong way.
    expect(plans.fastest.totalDurationSec).toBeLessThan(30 * 60);
  });
});

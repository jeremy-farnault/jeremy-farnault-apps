import { describe, expect, it } from "vitest";
import {
  BUBBLE_SIZE,
  CENTRE,
  angleInSector,
  driftFraction,
  layoutOrbit,
  pointAt,
  radiusForDrift,
  ringFor,
  sectorFor,
} from "./orbit";

const NOW = new Date(2026, 2, 15, 12, 0);
const daysAgo = (n: number) => new Date(2026, 2, 15 - n, 12, 0);
const dist = (p: { x: number; y: number }) => Math.hypot(p.x - CENTRE, p.y - CENTRE);

describe("driftFraction", () => {
  it("puts a just-touched person at the inner edge", () => {
    expect(driftFraction(0)).toBe(0);
  });

  it("puts a never-touched person at the very rim, outside everyone else", () => {
    expect(driftFraction(Number.POSITIVE_INFINITY)).toBe(1);
    expect(driftFraction(100_000)).toBeLessThan(1);
  });

  it("is monotonic in drift", () => {
    const samples = [0, 1, 3, 7, 14, 30, 90, 200, 365].map(driftFraction);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeGreaterThan(samples[i - 1]!);
    }
  });

  it("compresses so the week-to-month range gets real room", () => {
    // The 7→30 day step should be a bigger visual jump than 300→365,
    // which is the whole point of the log compression.
    const early = driftFraction(30) - driftFraction(7);
    const late = driftFraction(365) - driftFraction(300);
    expect(early).toBeGreaterThan(late);
  });

  it("clamps negatives and never exceeds 1", () => {
    expect(driftFraction(-5)).toBe(0);
    expect(driftFraction(10_000)).toBeLessThanOrEqual(1);
  });
});

describe("radiusForDrift", () => {
  it("keeps a hole in the middle for 'me'", () => {
    expect(radiusForDrift(0)).toBeGreaterThan(BUBBLE_SIZE);
  });

  it("places neglected further out than recently touched (AC#3)", () => {
    expect(radiusForDrift(90)).toBeGreaterThan(radiusForDrift(3));
    expect(radiusForDrift(Number.POSITIVE_INFINITY)).toBeGreaterThan(radiusForDrift(365));
  });

  it("stays inside the viewBox", () => {
    expect(CENTRE + radiusForDrift(Number.POSITIVE_INFINITY)).toBeLessThan(CENTRE * 2);
  });
});

describe("sectorFor", () => {
  it("divides the full circle evenly", () => {
    const spans = [0, 1, 2, 3].map((i) => {
      const s = sectorFor(i, 4);
      return s.end - s.start;
    });
    for (const span of spans) expect(span).toBeCloseTo(Math.PI / 2);
  });

  it("starts the first arc at 12 o'clock", () => {
    expect(sectorFor(0, 4).start).toBeCloseTo(-Math.PI / 2);
  });

  it("gives a lone arc the whole circle", () => {
    const s = sectorFor(0, 1);
    expect(s.end - s.start).toBeCloseTo(Math.PI * 2);
  });

  it("does not overlap adjacent sectors", () => {
    expect(sectorFor(0, 3).end).toBeCloseTo(sectorFor(1, 3).start);
  });
});

describe("angleInSector", () => {
  const sector = { start: 0, end: Math.PI / 2 };

  it("centres a single person in their sector", () => {
    expect(angleInSector(0, 1, sector)).toBeCloseTo(Math.PI / 4);
  });

  it("fans people out evenly and in order", () => {
    const angles = [0, 1, 2, 3].map((i) => angleInSector(i, 4, sector));
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]!).toBeGreaterThan(angles[i - 1]!);
    }
    const gaps = angles.slice(1).map((a, i) => a - angles[i]!);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!);
  });

  it("pads the edges so neighbouring arcs never collide", () => {
    const first = angleInSector(0, 4, sector);
    const last = angleInSector(3, 4, sector);
    expect(first).toBeGreaterThan(sector.start);
    expect(last).toBeLessThan(sector.end);
  });
});

describe("ringFor", () => {
  it("is absent for an unflagged person", () => {
    expect(ringFor(null, NOW)).toBeNull();
  });

  it("clears the bubble even when freshly flagged", () => {
    expect(ringFor(NOW, NOW)!.gap).toBeGreaterThan(0);
  });

  it("grows and strengthens with the flag's age", () => {
    const fresh = ringFor(daysAgo(0), NOW)!;
    const old = ringFor(daysAgo(60), NOW)!;
    expect(old.gap).toBeGreaterThan(fresh.gap);
    expect(old.opacity).toBeGreaterThan(fresh.opacity);
    expect(old.width).toBeGreaterThan(fresh.width);
  });

  it("caps so an ancient flag stays legible", () => {
    const capped = ringFor(daysAgo(90), NOW)!;
    const ancient = ringFor(daysAgo(900), NOW)!;
    expect(ancient.gap).toBeCloseTo(capped.gap);
    expect(ancient.width).toBeCloseTo(capped.width);
    expect(ancient.opacity).toBeCloseTo(capped.opacity);
  });

  it("never exceeds full opacity", () => {
    expect(ringFor(daysAgo(900), NOW)!.opacity).toBeLessThanOrEqual(1);
  });
});

describe("layoutOrbit", () => {
  const arcs = [
    { id: "a1", name: "Family", color: "var(--teal-600)", position: "a0" },
    { id: "a2", name: "Work", color: null, position: "a1" },
  ];
  const people = [
    {
      id: "p1",
      name: "Ann",
      arcId: "a1",
      avatarUrl: null,
      color: null,
      important: false,
      flaggedAt: null,
    },
    {
      id: "p2",
      name: "Bob",
      arcId: "a1",
      avatarUrl: null,
      color: null,
      important: true,
      flaggedAt: daysAgo(30),
    },
    {
      id: "p3",
      name: "Cal",
      arcId: "a2",
      avatarUrl: "https://example.test/cal.jpg",
      color: "var(--red-400)",
      important: false,
      flaggedAt: null,
    },
  ];

  it("lays out every person exactly once", () => {
    const dots = layoutOrbit(arcs, people, {}, NOW);
    expect(dots.map((d) => d.id).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("takes a bubble's colour from its arc, falling back to the accent (AC#4)", () => {
    const dots = layoutOrbit(arcs, people, {}, NOW);
    expect(dots.find((d) => d.id === "p1")!.color).toBe("var(--teal-600)");
    expect(dots.find((d) => d.id === "p2")!.arcColor).toBe("var(--teal-600)");
  });

  it("lets a person's own colour win over their arc's, but never the spoke's", () => {
    const cal = layoutOrbit(arcs, people, {}, NOW).find((d) => d.id === "p3")!;
    expect(cal.color).toBe("var(--red-400)");
    expect(cal.arcColor).toBe("var(--primary)");
    expect(cal.avatarUrl).toBe("https://example.test/cal.jpg");
  });

  it("separates arcs by angle (AC#2)", () => {
    const dots = layoutOrbit(arcs, people, {}, NOW);
    const ann = dots.find((d) => d.id === "p1")!;
    const cal = dots.find((d) => d.id === "p3")!;
    const angleOf = (d: { x: number; y: number }) => Math.atan2(d.y - CENTRE, d.x - CENTRE);
    expect(angleOf(ann)).not.toBeCloseTo(angleOf(cal));
  });

  it("moves a dot inward when a touch is logged (AC#7)", () => {
    const untouched = layoutOrbit(arcs, people, {}, NOW);
    const touched = layoutOrbit(arcs, people, { p1: NOW }, NOW);
    const before = dist(untouched.find((d) => d.id === "p1")!);
    const after = dist(touched.find((d) => d.id === "p1")!);
    expect(after).toBeLessThan(before);
  });

  it("keeps a dot's angle fixed when only its drift changes", () => {
    const a = layoutOrbit(arcs, people, {}, NOW);
    const b = layoutOrbit(arcs, people, { p1: daysAgo(5) }, NOW);
    const angleOf = (d: { x: number; y: number }) => Math.atan2(d.y - CENTRE, d.x - CENTRE);
    expect(angleOf(a.find((d) => d.id === "p1")!)).toBeCloseTo(
      angleOf(b.find((d) => d.id === "p1")!)
    );
  });

  it("rings only the flagged person, independent of drift (AC#5)", () => {
    // Bob is flagged AND freshly touched; Ann is neither.
    const dots = layoutOrbit(arcs, people, { p1: NOW, p2: NOW }, NOW);
    expect(dots.find((d) => d.id === "p2")!.ring).not.toBeNull();
    expect(dots.find((d) => d.id === "p1")!.ring).toBeNull();
  });

  it("puts never-touched people outside everyone touched", () => {
    const dots = layoutOrbit(arcs, people, { p1: daysAgo(200) }, NOW);
    const ann = dist(dots.find((d) => d.id === "p1")!); // touched 200 days ago
    const bob = dist(dots.find((d) => d.id === "p2")!); // never touched
    expect(bob).toBeGreaterThan(ann);
  });

  it("skips people whose arc is not in the list", () => {
    const orphan = [
      {
        id: "px",
        name: "Ghost",
        arcId: "gone",
        avatarUrl: null,
        color: null,
        important: false,
        flaggedAt: null,
      },
    ];
    expect(layoutOrbit(arcs, orphan, {}, NOW)).toHaveLength(0);
  });

  it("handles an empty world", () => {
    expect(layoutOrbit([], [], {}, NOW)).toEqual([]);
  });
});

describe("pointAt", () => {
  it("places angle 0 directly right of centre", () => {
    const p = pointAt(0, 100);
    expect(p.x).toBeCloseTo(CENTRE + 100);
    expect(p.y).toBeCloseTo(CENTRE);
  });

  it("places -PI/2 directly above centre", () => {
    const p = pointAt(-Math.PI / 2, 100);
    expect(p.x).toBeCloseTo(CENTRE);
    expect(p.y).toBeCloseTo(CENTRE - 100);
  });
});

"use client";

import { formatDrift } from "@/lib/drift";
import {
  CENTRE,
  DOT_RADIUS,
  GUIDE_DAYS,
  type OrbitArc,
  type OrbitPerson,
  VIEW,
  layoutOrbit,
  radiusForDrift,
} from "@/lib/orbit";
import { useSession } from "@jf/auth/client";
import { ArrowsOutIcon, InfoIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

type Props = {
  arcs: OrbitArc[];
  people: OrbitPerson[];
  lastTouchAt: Record<string, Date>;
  onLogTouch: (personId: string) => Promise<void>;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** Generous invisible tap area around each dot — the visible dot stays small. */
const HIT_RADIUS = 17;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The weekly-review surface: "me" at the centre, everyone else a dot whose angle is
 * their arc and whose distance is how far they've drifted. Flagged people carry a halo
 * that grows with the flag's age.
 *
 * At the expected scale (~30–40 people) neighbouring dots sit only ~23px apart on a
 * phone, which is below any comfortable tap target — so the orbit zooms and pans rather
 * than becoming a separate mobile design. Geometry still comes entirely from
 * `layoutOrbit`; zoom only moves the viewBox.
 */
export function OrbitView({ arcs, people, lastTouchAt, onLogTouch }: Props) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragged = useRef(false);

  // "me" at the centre is the user's own avatar, falling back to their initial.
  const meImage = session?.user?.image ?? null;
  const meLetter = (session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "").toUpperCase();

  const now = new Date();
  const dots = layoutOrbit(arcs, people, lastTouchAt, now);

  // The visible window into the 400×400 world.
  const span = VIEW / zoom;
  const maxPan = (VIEW - span) / 2;
  const vx = CENTRE - span / 2 + clamp(pan.x, -maxPan, maxPan);
  const vy = CENTRE - span / 2 + clamp(pan.y, -maxPan, maxPan);

  /** viewBox units per rendered pixel, for converting drag deltas. */
  const unitsPerPixel = useCallback(() => {
    const width = svgRef.current?.getBoundingClientRect().width ?? VIEW;
    return span / (width || VIEW);
  }, [span]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = clamp(
        pinchStart.current.zoom * (dist / (pinchStart.current.dist || 1)),
        MIN_ZOOM,
        MAX_ZOOM
      );
      dragged.current = true;
      setZoom(next);
      return;
    }

    const dx = e.clientX - previous.x;
    const dy = e.clientY - previous.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragged.current = true;
    const scale = unitsPerPixel();
    setPan((p) => ({ x: p.x - dx * scale, y: p.y - dy * scale }));
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  }

  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  async function logTouch(personId: string) {
    if (busy) return;
    setBusy(personId);
    try {
      await onLogTouch(personId);
    } finally {
      setBusy(null);
    }
  }

  /** Container-relative percent for a point in world units, honouring zoom and pan. */
  const toPercent = (x: number, y: number) => ({
    left: `${((x - vx) / span) * 100}%`,
    top: `${((y - vy) / span) * 100}%`,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full max-w-[560px] self-center">
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${span} ${span}`}
          className="absolute inset-0 h-full w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label={`Orbit of ${dots.length} people across ${arcs.length} arcs`}
        >
          {/* Reference rings at the week / month / quarter marks. Unlabelled on purpose —
              they calibrate the eye without turning the orbit into a chart. */}
          {GUIDE_DAYS.map((days) => (
            <circle
              key={days}
              cx={CENTRE}
              cy={CENTRE}
              r={radiusForDrift(days)}
              fill="none"
              stroke="var(--grey-200)"
              strokeWidth={1 / zoom}
              strokeDasharray={`${2 / zoom} ${4 / zoom}`}
            />
          ))}

          {/* Arc sector dividers, so sectors stay distinguishable when zoomed in. */}
          {arcs.length > 1 &&
            arcs.map((arc, i) => {
              const angle = -Math.PI / 2 + (i * Math.PI * 2) / arcs.length;
              return (
                <line
                  key={arc.id}
                  x1={CENTRE + Math.cos(angle) * 38}
                  y1={CENTRE + Math.sin(angle) * 38}
                  x2={CENTRE + Math.cos(angle) * 182}
                  y2={CENTRE + Math.sin(angle) * 182}
                  stroke="var(--grey-200)"
                  strokeWidth={1 / zoom}
                />
              );
            })}

          {/* The centre is me. The avatar itself is an HTML image in the overlay below —
              it only ever sits on top of this disc, which stays as its backdrop. */}
          <circle cx={CENTRE} cy={CENTRE} r={26} fill="var(--surface-200)" />
          {!meImage && (
            <text
              x={CENTRE}
              y={CENTRE}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-(--grey-700) font-semibold"
              style={{ fontSize: meLetter ? 18 : 11 }}
            >
              {meLetter || "me"}
            </text>
          )}

          {dots.map((dot) => {
            const drift = formatDrift(lastTouchAt[dot.id] ?? null, now);
            const label = `${dot.name} — ${dot.arcName}, ${drift}`;
            return (
              <g key={dot.id}>
                {dot.ring && (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.ring.radius}
                    fill="none"
                    stroke="var(--red-500)"
                    strokeWidth={dot.ring.width}
                    opacity={dot.ring.opacity}
                  />
                )}

                {/* A real link, so it is keyboard reachable and middle-clickable. The
                    transparent circle behind the dot is the actual tap target — at 40
                    people the visible dots are far too small to hit reliably. */}
                <Link
                  href={`/people/${dot.id}`}
                  aria-label={`Open ${label}`}
                  onClick={(e) => {
                    // A pan gesture that ends over a dot must not navigate.
                    if (dragged.current) e.preventDefault();
                  }}
                >
                  <circle cx={dot.x} cy={dot.y} r={HIT_RADIUS} fill="transparent" />
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={DOT_RADIUS}
                    fill={dot.color}
                    stroke="var(--surface-100)"
                    strokeWidth={1.5}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                  <title>{label}</title>
                </Link>
              </g>
            );
          })}
        </svg>

        {/* Log-touch affordances live in an HTML overlay rather than inside the SVG:
            a real button cannot be a child of an svg element, and these need to be
            proper buttons to be keyboard- and screen-reader-reachable. Each has a
            44px hit area with a smaller visible pill inside it. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {meImage && (
            <img
              src={meImage}
              alt="You, at the centre"
              referrerPolicy="no-referrer"
              style={{ ...toPercent(CENTRE, CENTRE), width: `${(52 / span) * 100}%` }}
              className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
            />
          )}
          {dots.map((dot) => {
            const out = Math.hypot(dot.x - CENTRE, dot.y - CENTRE) || 1;
            const offset = (dot.ring?.radius ?? DOT_RADIUS) + 9;
            const bx = dot.x + ((dot.x - CENTRE) / out) * offset;
            const by = dot.y + ((dot.y - CENTRE) / out) * offset;
            return (
              <button
                key={dot.id}
                type="button"
                onClick={() => void logTouch(dot.id)}
                disabled={busy === dot.id}
                aria-label={`Log a touch with ${dot.name}`}
                style={toPercent(bx, by)}
                className="pointer-events-auto absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full disabled:opacity-40"
              >
                {/* Visible pill: small, but always visible — touch devices have no
                    hover, so it cannot depend on one to be discoverable. */}
                <span className="grid h-5 w-5 place-items-center rounded-full bg-(--surface-300) text-[11px] font-bold leading-none text-(--grey-900) opacity-70 transition-transform active:scale-90 group-hover:opacity-100 sm:opacity-45 sm:hover:opacity-100">
                  {busy === dot.id ? "·" : "+"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zoom controls: the orbit scales and pans rather than becoming a separate
            mobile design. */}
        <div className="absolute right-1 bottom-1 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z * 1.5, MIN_ZOOM, MAX_ZOOM))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="grid h-11 w-11 place-items-center rounded-full bg-(--surface-200) text-(--grey-800) transition-transform active:scale-90 disabled:opacity-30"
          >
            <PlusIcon size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => clamp(z / 1.5, MIN_ZOOM, MAX_ZOOM))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="grid h-11 w-11 place-items-center rounded-full bg-(--surface-200) text-(--grey-800) transition-transform active:scale-90 disabled:opacity-30"
          >
            <MinusIcon size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            aria-label="Reset the view"
            className="grid h-11 w-11 place-items-center rounded-full bg-(--surface-200) text-(--grey-800) transition-transform active:scale-90 disabled:opacity-30"
          >
            <ArrowsOutIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-2">
        {arcs.map((arc) => (
          <span key={arc.id} className="flex items-center gap-1.5 text-xs text-(--grey-600)">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: arc.color ?? "var(--primary)" }}
              aria-hidden
            />
            {arc.name}
          </span>
        ))}
      </div>
      {/* How to read the orbit is worth one read, not a permanent caption under it. */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          aria-controls="orbit-help"
          className="flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-xs text-(--grey-500) transition-colors hover:bg-(--surface-150) hover:text-(--grey-900)"
        >
          <InfoIcon size={14} /> How to read this
        </button>
        {helpOpen && (
          <p id="orbit-help" className="px-2 text-center text-xs text-(--grey-500)">
            Further out means longer since you reached out. A red halo is a critical flag, growing
            the longer it stays unresolved. Tap a dot to open someone, or + to log a touch. Pinch or
            drag to zoom in when dots crowd.
          </p>
        )}
      </div>
    </div>
  );
}

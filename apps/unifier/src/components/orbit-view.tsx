"use client";

import { formatDrift } from "@/lib/drift";
import {
  BUBBLE_HIT_PADDING,
  BUBBLE_SIZE,
  CENTRE,
  FRAME_MAX_PX,
  GUIDE_DAYS,
  ME_SIZE,
  type OrbitArc,
  type OrbitPerson,
  VIEW,
  layoutOrbit,
  pxToUnits,
  radiusForDrift,
} from "@/lib/orbit";
import { useSession } from "@jf/auth/client";
import {
  ArrowsOutIcon,
  HandWavingIcon,
  InfoIcon,
  MinusIcon,
  PencilSimpleIcon,
  PlusIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { PersonBubble } from "./person-bubble";

type Props = {
  arcs: OrbitArc[];
  people: OrbitPerson[];
  lastTouchAt: Record<string, Date>;
  onLogTouch: (personId: string) => Promise<void>;
  onToggleImportant: (personId: string, important: boolean) => Promise<void>;
  onEditPerson: (personId: string) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** The centre disc, in viewBox units, and the radius at which a spoke leaves its edge. */
const ME_RADIUS = pxToUnits(ME_SIZE) / 2;
const SPOKE_START = ME_RADIUS + 1;

/**
 * The period each reference ring stands for, revealed on hover. The outermost ring is
 * the horizon everything beyond it clamps onto, so it reads "or more" — worked out from
 * GUIDE_DAYS rather than written in, so moving the horizon cannot leave it lying.
 */
const GUIDE_PERIODS: Record<number, string> = {
  7: "A week",
  30: "A month",
  90: "Three months",
  180: "Six months",
};

const guideLabel = (days: number, outermost: boolean) =>
  outermost ? `${GUIDE_PERIODS[days]} or more` : `${GUIDE_PERIODS[days]} since your last touch`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const CARD_ACTION =
  "flex min-h-10 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-sm text-(--grey-700) transition-colors hover:bg-(--surface-150) hover:text-(--grey-900) disabled:opacity-50";

/**
 * The weekly-review surface: "me" at the centre, everyone else a bubble — their photo
 * or their initials — whose angle is their arc and whose distance is how far they have
 * drifted. A spoke in the arc's colour ties them back to the centre, and a flagged
 * person wears a ring that grows with the flag's age.
 *
 * At the expected scale (~30–40 people) neighbouring bubbles sit only ~10–18px apart,
 * so the orbit zooms and pans rather than becoming a separate mobile design. Bubbles
 * hold a fixed on-screen size while the geometry zooms underneath them, which is what
 * makes zooming pull a crowded arc apart instead of magnifying it unchanged.
 */
export function OrbitView({
  arcs,
  people,
  lastTouchAt,
  onLogTouch,
  onToggleImportant,
  onEditPerson,
}: Props) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [openPersonId, setOpenPersonId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const dragged = useRef(false);

  // "me" at the centre is the user's own avatar, falling back to their initial.
  const meImage = session?.user?.image ?? null;
  const meLetter = (session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? "").toUpperCase();

  const now = new Date();
  const dots = layoutOrbit(arcs, people, lastTouchAt, now);
  // Flagged people paint last, so the loudest signal is never buried under a neighbour.
  const painted = [...dots].sort((a, b) => {
    if (!!a.ring !== !!b.ring) return a.ring ? 1 : -1;
    return a.driftDays - b.driftDays;
  });

  // The visible window into the 400×400 world.
  const span = VIEW / zoom;
  const maxPan = (VIEW - span) / 2;
  const vx = CENTRE - span / 2 + clamp(pan.x, -maxPan, maxPan);
  const vy = CENTRE - span / 2 + clamp(pan.y, -maxPan, maxPan);

  /** viewBox units per rendered pixel, for converting drag deltas. */
  const unitsPerPixel = useCallback(() => {
    const width = frameRef.current?.getBoundingClientRect().width ?? VIEW;
    return span / (width || VIEW);
  }, [span]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
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

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
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
      setOpenPersonId(null);
    } finally {
      setBusy(null);
    }
  }

  async function toggleImportant(personId: string, important: boolean) {
    if (busy) return;
    setBusy(personId);
    try {
      await onToggleImportant(personId, important);
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
      {/* Pan and pinch live on the frame, not the svg: the bubbles sit in an HTML
          overlay above it, and a drag that starts on someone's face must still pan. */}
      <div
        ref={frameRef}
        style={{ maxWidth: FRAME_MAX_PX }}
        className="relative aspect-square w-full touch-none select-none self-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          viewBox={`${vx} ${vy} ${span} ${span}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Orbit of ${dots.length} people across ${arcs.length} arcs`}
        >
          {/* Reference rings at the week / month / quarter marks. Unlabelled on purpose —
              they calibrate the eye without turning the orbit into a chart. */}
          {GUIDE_DAYS.map((days, i) => (
            <g key={days}>
              <circle
                cx={CENTRE}
                cy={CENTRE}
                r={radiusForDrift(days)}
                fill="none"
                stroke="var(--grey-400)"
                strokeWidth={1 / zoom}
                strokeDasharray={`${2 / zoom} ${4 / zoom}`}
              />
              {/* A fat, invisible companion: the dashes themselves are too thin and too
                  gappy to hover, so this is what carries the explanation. */}
              <circle
                cx={CENTRE}
                cy={CENTRE}
                r={radiusForDrift(days)}
                fill="none"
                stroke="transparent"
                strokeWidth={12 / zoom}
                style={{ pointerEvents: "stroke" }}
              >
                <title>{guideLabel(days, i === GUIDE_DAYS.length - 1)}</title>
              </circle>
            </g>
          ))}

          {/* One spoke per person, in their arc's colour: this is what says which arc
              someone belongs to, now that their bubble shows their face instead. It runs
              to the dot's centre and vanishes under the bubble drawn over it. */}
          {dots.map((dot) => {
            const out = Math.hypot(dot.x - CENTRE, dot.y - CENTRE) || 1;
            return (
              <line
                key={dot.id}
                x1={CENTRE + ((dot.x - CENTRE) / out) * SPOKE_START}
                y1={CENTRE + ((dot.y - CENTRE) / out) * SPOKE_START}
                x2={dot.x}
                y2={dot.y}
                stroke={dot.arcColor}
                strokeWidth={1.75 / zoom}
                opacity={0.45}
              />
            );
          })}

          {/* The centre is me. The avatar itself is an HTML image in the overlay below —
              it only ever sits on top of this disc, which stays as its backdrop. */}
          <circle cx={CENTRE} cy={CENTRE} r={ME_RADIUS} fill="var(--surface-200)" />
          {!meImage && (
            <text
              x={CENTRE}
              y={CENTRE}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-(--grey-700) font-semibold"
              style={{ fontSize: meLetter ? ME_RADIUS * 0.85 : ME_RADIUS * 0.52 }}
            >
              {meLetter || "me"}
            </text>
          )}
        </svg>

        {/* People live in an HTML overlay rather than inside the SVG: they need to be
            real buttons to be keyboard- and screen-reader-reachable, they carry photos,
            and they must hold a fixed pixel size while the viewBox zooms under them. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {meImage && (
            <img
              src={meImage}
              alt="You, at the centre"
              referrerPolicy="no-referrer"
              style={{ ...toPercent(CENTRE, CENTRE), width: `${((ME_RADIUS * 2) / span) * 100}%` }}
              className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
            />
          )}

          {painted.map((dot) => {
            const person = people.find((p) => p.id === dot.id);
            const drift = formatDrift(lastTouchAt[dot.id] ?? null, now);
            const flagged = person?.important ?? false;
            return (
              <Popover.Root
                key={dot.id}
                open={openPersonId === dot.id}
                onOpenChange={(open) => {
                  // A pan gesture that ends over someone must not open their card.
                  if (open && dragged.current) return;
                  setOpenPersonId(open ? dot.id : null);
                }}
              >
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    aria-label={`${dot.name} - ${dot.arcName}, ${drift}`}
                    title={`${dot.name} - ${dot.arcName}, ${drift}`}
                    style={{
                      ...toPercent(dot.x, dot.y),
                      width: BUBBLE_SIZE + BUBBLE_HIT_PADDING * 2,
                      height: BUBBLE_SIZE + BUBBLE_HIT_PADDING * 2,
                    }}
                    className="pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full transition-transform active:scale-95"
                  >
                    <PersonBubble
                      name={dot.name}
                      avatarUrl={dot.avatarUrl}
                      color={dot.color}
                      arcColor={dot.arcColor}
                      size={BUBBLE_SIZE}
                      ring={dot.ring ?? undefined}
                      outlined
                    />
                  </button>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Content
                    side="top"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-50 flex w-[220px] flex-col gap-1 rounded-[18px] bg-(--card) p-2 shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none animate-[overlay-in_0.2s_ease-in-out]"
                  >
                    <div className="flex items-center gap-2 px-1.5 pt-1 pb-2">
                      <PersonBubble
                        name={dot.name}
                        avatarUrl={dot.avatarUrl}
                        color={dot.color}
                        arcColor={dot.arcColor}
                        size={28}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-(--grey-900)">
                          {dot.name}
                        </span>
                        <span className="truncate text-xs text-(--grey-500)">
                          {dot.arcName} · {drift}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void logTouch(dot.id)}
                      disabled={busy === dot.id}
                      className="flex min-h-10 w-full items-center gap-2 rounded-[10px] bg-(--primary) px-2.5 text-sm font-medium text-(--primary-foreground) transition-transform active:scale-[0.98] disabled:opacity-50"
                    >
                      <HandWavingIcon size={16} weight="fill" /> Log touch
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleImportant(dot.id, !flagged)}
                      disabled={busy === dot.id}
                      className={
                        flagged
                          ? `${CARD_ACTION} text-(--red-600) hover:text-(--red-600)`
                          : CARD_ACTION
                      }
                    >
                      <SealWarningIcon size={16} weight={flagged ? "fill" : "regular"} />
                      {flagged ? "Clear critical flag" : "Flag as critical"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenPersonId(null);
                        onEditPerson(dot.id);
                      }}
                      className={CARD_ACTION}
                    >
                      <PencilSimpleIcon size={16} /> Edit
                    </button>

                    <Link href={`/people/${dot.id}`} className={CARD_ACTION}>
                      <ArrowsOutIcon size={16} /> Open profile
                    </Link>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
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

      {/* How to read the orbit is worth one read, and it floats: pushing a paragraph
          into the column below the button shoved the whole page around. */}
      <div className="flex justify-center">
        <Popover.Root open={helpOpen} onOpenChange={setHelpOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-xs text-(--grey-500) transition-colors hover:bg-(--surface-150) hover:text-(--grey-900)"
            >
              <InfoIcon size={14} /> How to read this
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="top"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 w-[280px] rounded-[10px] bg-(--grey-900) px-2.5 py-2 text-xs leading-relaxed text-white outline-none animate-[overlay-in_0.2s_ease-in-out]"
            >
              Further out means longer since you reached out, and each spoke carries the colour of
              the arc someone belongs to. A red ring is a critical flag, growing the longer it stays
              unresolved. Tap someone to log a touch, flag them, or open them.
              <Popover.Arrow className="fill-(--grey-900)" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}

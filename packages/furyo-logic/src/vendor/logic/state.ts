import { balance } from '../balance/balance'
import { nightAt, type SleepWindow } from './sleep'

/** Bumped whenever the saved shape changes; `migrate` brings older saves up to date. */
export const STATE_VERSION = 8

export type Gender = 'male' | 'female'

export const VITALS = ['stamina', 'belly', 'style'] as const
export const GROWTH_STATS = ['smarts', 'rep', 'guts', 'power'] as const
export const STATS = [...VITALS, 'yen', ...GROWTH_STATS] as const

/** Go down over time. */
export type VitalId = (typeof VITALS)[number]
/** Only go up in v1. */
export type GrowthId = (typeof GROWTH_STATS)[number]
export type StatId = (typeof STATS)[number]
export type ItemId = keyof typeof balance.items
export const ITEMS = Object.keys(balance.items) as ItemId[]
export type StanceId = keyof typeof balance.stances
export const STANCES = Object.keys(balance.stances) as StanceId[]
export type DurationId = keyof typeof balance.durations
export const DURATIONS = Object.keys(balance.durations) as DurationId[]
export type CalendarId = keyof typeof balance.calendar
export const CALENDAR = Object.keys(balance.calendar) as CalendarId[]
export type VisitorId = keyof typeof balance.visitors.kinds
export const VISITORS = Object.keys(balance.visitors.kinds) as VisitorId[]

/** What each visitor can be answered with. The first is the one the popup puts first. */
export const VISITOR_RESPONSES = {
  rival: ['fight', 'backOff'],
  friend: ['lend', 'refuse'],
  cop: ['comply'],
  stray: ['feed', 'ignore'],
  delivery: ['accept'],
} as const satisfies Record<VisitorId, readonly string[]>
export type VisitorResponse = (typeof VISITOR_RESPONSES)[VisitorId][number]

/** A visitor waiting for an answer, until `leavesAt`. */
export interface PendingVisitor {
  id: VisitorId
  arrivedAt: number
  leavesAt: number
}

/** Yen lent to the Friend: `repayment` (the loan and its bonus) comes back at `repayAt`. */
export interface Loan {
  amount: number
  repayment: number
  lentAt: number
  repayAt: number
}

/** The stance running now. Its gains and costs so far are already in the stats. */
export interface ActiveStance {
  id: StanceId
  duration: DurationId
  startedAt: number
  endsAt: number
}

/**
 * His sleep schedule: the window in local time (minutes after midnight) and
 * the IANA time zone it's local to, set by the client. `asleep` is the night
 * he's sleeping through, null when awake (by day, or woken early).
 */
export interface SleepSettings {
  window: SleepWindow
  timeZone: string
  asleep: { since: number; wakesAt: number } | null
}

export type SetbackId = keyof typeof balance.neglect.setbacks
/** In ladder order: the first mistake in the window collapses him, and so on. */
export const SETBACKS = Object.keys(balance.neglect.setbacks) as SetbackId[]

/** A vital left at 0 too long, and what it cost him. */
export interface CareMistake {
  stat: VitalId
  setback: SetbackId
  at: number
}

/** How a furyo's life ended. */
export type Ending =
  /** Too many care mistakes too close together: the last setback put him on the street. */
  | { reason: 'mistakes' }
  /** A vital at 0 for a whole day. */
  | { reason: 'neglected'; stat: VitalId }
  /** A new game was started while he was alive. */
  | { reason: 'leftBehind' }

export interface GameOver {
  at: number
  ending: Ending
}

/** One line in the record of past furyos. */
export interface PastFuryo {
  name: string
  gender: Gender
  bornAt: number
  endedAt: number
  ending: Ending
  careMistakes: number
}

/**
 * Neglect: for each vital, the stretch it's been at 0 (`counted` once that
 * stretch was a care mistake), and every care mistake so far.
 */
export interface Neglect {
  atZero: Record<VitalId, { since: number; counted: boolean } | null>
  mistakes: CareMistake[]
}

/**
 * Everything about one furyo. Plain data only: it's saved as JSON as is.
 * Times are milliseconds since the Unix epoch.
 */
export interface FuryoState {
  version: typeof STATE_VERSION
  name: string
  gender: Gender
  stats: Record<StatId, number>
  inventory: Record<ItemId, number>
  stance: ActiveStance | null
  sleep: SleepSettings
  /** When the game started, for one-time calendar events (the welcome gift). */
  bornAt: number
  neglect: Neglect
  /** Set when his life fell apart: nothing moves after it. */
  over: GameOver | null
  /** The furyos before this one, oldest first. Carried into each new game. */
  history: PastFuryo[]
  /** The visitor waiting for an answer, if any. Only the client brings them, while the game is open. */
  visitor: PendingVisitor | null
  /** Loans to the Friend not repaid yet, in the order they were made. */
  loans: Loan[]
  /** The random generator's state, for visitor outcomes (a 32-bit integer). */
  seed: number
  /** The time the state is up to date with: `advance` runs from here. */
  lastUpdated: number
}

export interface NewFuryo {
  name: string
  gender: Gender
  /** The device's IANA time zone; the balance file's default if left out. */
  timeZone?: string
  /** The record of past furyos, carried over from the last game. */
  history?: PastFuryo[]
  /** The random generator's start (the client picks one); the birth time if left out. */
  seed?: number
}

/** A new furyo, asleep straight away if he's born inside the sleep window. */
export function createFuryo({ name, gender, timeZone = balance.sleep.defaultTimeZone, history = [], seed }: NewFuryo, now: number): FuryoState {
  return {
    version: STATE_VERSION,
    name,
    gender,
    stats: { ...balance.start },
    inventory: { ...balance.starterInventory },
    stance: null,
    sleep: sleepSettings({ ...balance.sleep.window }, timeZone, now),
    bornAt: now,
    neglect: noNeglect(),
    over: null,
    history: [...history],
    visitor: null,
    loans: [],
    seed: (seed ?? now) >>> 0,
    lastUpdated: now,
  }
}

function noNeglect(): Neglect {
  return { atZero: { stamina: null, belly: null, style: null }, mistakes: [] }
}

/**
 * The record of past furyos once this one is gone: his own line added, as
 * game over left it, or as left behind at `now` if he was still alive.
 */
export function retire(state: FuryoState, now: number): PastFuryo[] {
  const ended = state.over ?? { at: now, ending: { reason: 'leftBehind' } as const }
  return [
    ...state.history,
    {
      name: state.name,
      gender: state.gender,
      bornAt: state.bornAt,
      endedAt: ended.at,
      ending: ended.ending,
      careMistakes: state.neglect.mistakes.length,
    },
  ]
}

/** Sleep settings for a window, asleep if `t` falls inside it. */
export function sleepSettings(window: SleepWindow, timeZone: string, t: number): SleepSettings {
  const night = nightAt(t, window, timeZone)
  return { window, timeZone, asleep: night ? { since: t, wakesAt: night.end } : null }
}

export function boundsOf(stat: StatId): { min: number; max: number } {
  if (stat === 'yen') return balance.bounds.yen
  return (VITALS as readonly string[]).includes(stat) ? balance.bounds.vital : balance.bounds.growth
}

export function clampStat(stat: StatId, value: number): number {
  const { min, max } = boundsOf(stat)
  return Math.min(max, Math.max(min, value))
}

/**
 * Brings a stored state up to the current version, or returns null if it
 * can't be read. Each step upgrades one version:
 * - v1 (ticket 02) only had belly and Onigiri: the other stats get their
 *   start values and the other items 0.
 * - v2 (ticket 03) had no stance: none is running.
 * - v3 (ticket 05) had no cram book or arcade round: he owns none.
 * - v4 (ticket 07) had no sleep: the default window in the default time
 *   zone (the client corrects the zone on open), asleep if the save was
 *   last updated inside it.
 * - v5 (ticket 08) had no birth time: born at the migration's last update,
 *   so the welcome gift comes two days later.
 * - v6 (ticket 09) had no neglect: no mistakes, no past furyos, alive, and a
 *   vital already at 0 starts its stretch at the last update.
 * - v7 (ticket 10) had no visitors: none waiting, no loans, and a seed
 *   from the birth time.
 */
export function migrate(stored: unknown): FuryoState | null {
  if (typeof stored !== 'object' || stored === null) return null
  let s = stored as Record<string, unknown> & { version?: number }

  if (s.version === 1) {
    const none = Object.fromEntries(ITEMS.map((id) => [id, 0]))
    s = {
      ...s,
      version: 2,
      stats: { ...balance.start, ...(s.stats as object) },
      inventory: { ...none, ...(s.inventory as object) },
    }
  }
  if (s.version === 2) s = { ...s, version: 3, stance: null }
  if (s.version === 3) {
    s = { ...s, version: 4, inventory: { ...(s.inventory as object), cramBook: 0, arcadeRound: 0 } }
  }
  if (s.version === 4) {
    const t = s.lastUpdated as number
    s = { ...s, version: 5, sleep: sleepSettings({ ...balance.sleep.window }, balance.sleep.defaultTimeZone, t) }
  }
  if (s.version === 5) s = { ...s, version: 6, bornAt: s.lastUpdated }
  if (s.version === 6) {
    const stats = s.stats as Record<VitalId, number>
    const t = s.lastUpdated as number
    const atZero = Object.fromEntries(VITALS.map((v) => [v, stats[v] <= 0 ? { since: t, counted: false } : null]))
    s = { ...s, version: 7, neglect: { atZero, mistakes: [] }, over: null, history: [] }
  }
  if (s.version === 7) s = { ...s, version: 8, visitor: null, loans: [], seed: (s.bornAt as number) >>> 0 }

  return s.version === STATE_VERSION ? (s as unknown as FuryoState) : null
}

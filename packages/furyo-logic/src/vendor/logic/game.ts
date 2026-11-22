import { balance } from '../balance/balance'
import { nextOccurrence, type Recurrence } from './calendar'
import { roll } from './random'
import { isTimeZone, isValidWindow, nextNight, nightAt, type SleepWindow } from './sleep'
import {
  CALENDAR,
  clampStat,
  SETBACKS,
  VISITOR_RESPONSES,
  type Loan,
  type VisitorId,
  type VisitorResponse,
  type CalendarId,
  type Ending,
  VITALS,
  type ActiveStance,
  type DurationId,
  type FuryoState,
  type ItemId,
  type StanceId,
  type StatId,
  type VitalId,
} from './state'

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MINUTE = 60 * 1000

/** What happened, in order. The "while you were away" summary is built from these. */
export type GameEvent =
  /** A vital fell below the balance file's low line. */
  | { type: 'vitalLow'; stat: VitalId; at: number }
  | { type: 'vitalEmptied'; stat: VitalId; at: number }
  /** `changes` are what it did to the stats after clamping (rent with no yen takes what's left). */
  | { type: 'calendarEvent'; event: CalendarId; changes: Partial<Record<StatId, number>>; items: Partial<Record<ItemId, number>>; at: number }
  | { type: 'itemUsed'; item: ItemId; stat: StatId; amount: number; at: number }
  | { type: 'bought'; cart: Cart; total: number; at: number }
  | { type: 'stanceStarted'; stance: StanceId; duration: DurationId; at: number }
  /** `completed` is false when stopped early. Gains and costs are what it gave in all. */
  | { type: 'stanceEnded'; stance: StanceId; completed: boolean; gained: number; paid: number; at: number }
  /** At the start of the sleep window (a running stance is stopped first). */
  | { type: 'fellAsleep'; wakesAt: number; at: number }
  /** `early` when woken before the window's end (by the player, or by a new window he's outside). */
  | { type: 'wokeUp'; early: boolean; at: number }
  | { type: 'sleepWindowSet'; window: SleepWindow; timeZone: string; at: number }
  /** A vital left at 0 too long. `changes` are the setback's, after clamping. */
  | { type: 'careMistake'; stat: VitalId; setback: (typeof SETBACKS)[number]; changes: Partial<Record<StatId, number>>; at: number }
  | { type: 'gameOver'; ending: Ending; at: number }
  /** A visitor came, and waits for an answer until `leavesAt`. */
  | { type: 'visitorArrived'; visitor: VisitorId; leavesAt: number; at: number }
  /** `changes` and `items` are what the answer did, after clamping (a fine takes only what's left). */
  | { type: 'visitorAnswered'; visitor: VisitorId; response: VisitorResponse; outcome: VisitorOutcome; changes: Partial<Record<StatId, number>>; items: Partial<Record<ItemId, number>>; at: number }
  /** Left without an answer, with no effect: his time was up, or he went to bed, or out. */
  | { type: 'visitorLeft'; visitor: VisitorId; reason: 'timeUp' | 'asleep' | 'out'; at: number }
  /** The Friend paid a loan back, with its bonus. */
  | { type: 'loanRepaid'; amount: number; repaid: number; at: number }
  | { type: 'commandRefused'; command: Command; reason: RefusalReason; at: number }

export type RefusalReason =
  | 'gameOver'
  | 'noneLeft'
  | 'stanceRunning'
  | 'noStance'
  | 'notEnoughYen'
  | 'emptyCart'
  | 'asleep'
  | 'notAsleep'
  | 'badWindow'
  /** Out for an off-screen stance: no one to visit. */
  | 'out'
  | 'visitorPresent'
  | 'noVisitor'
  /** The visitor's two minutes were up: he left before the answer. */
  | 'tooLate'
  /** Not something this visitor can be answered with. */
  | 'badResponse'

/** How an answer to a visitor turned out. */
export type VisitorOutcome =
  /** `won` when `roll` fell under `chance`. */
  | { kind: 'fight'; won: boolean; chance: number; roll: number }
  | { kind: 'backedOff' }
  | { kind: 'lent'; loan: Loan }
  | { kind: 'refused' }
  /** The Cop's style check: fined when his style was under the line. */
  | { kind: 'checked'; fined: boolean }
  | { kind: 'fed' }
  | { kind: 'ignored' }
  | { kind: 'delivered'; item: ItemId }

/** How many of each item to buy. Missing items count as 0. */
export type Cart = Partial<Record<ItemId, number>>

export type Command =
  | { type: 'useItem'; item: ItemId }
  | { type: 'buy'; cart: Cart }
  | { type: 'startStance'; stance: StanceId; duration: DurationId }
  | { type: 'stopStance' }
  /** Ends sleep early, at the early-wake cost. */
  | { type: 'wakeUp' }
  /**
   * A new window (minutes after local midnight) in an IANA time zone. If now
   * is inside it he falls asleep; if he's asleep and now isn't, he wakes
   * early. Sent unchanged (same window and zone), it leaves him as he is.
   */
  | { type: 'setSleepWindow'; window: SleepWindow; timeZone: string }
  /**
   * A visitor comes (the client decides when and who, only while the game is
   * open). Refused while he sleeps, while he's out, or while another waits.
   */
  | { type: 'visitorArrives'; visitor: VisitorId }
  /** Answers the waiting visitor. Refused with `tooLate` once his time is up. */
  | { type: 'answerVisitor'; response: VisitorResponse }

export interface Outcome {
  state: FuryoState
  events: GameEvent[]
}

/**
 * Runs time forward from `state.lastUpdated` to `now`. Pure: the same inputs
 * always give the same outputs, and one long step equals many short ones.
 * A `now` earlier than `lastUpdated` (the clock went back) changes nothing.
 *
 * The step is split at every change inside it, in time order: a stance
 * ending, sleep ending, calendar events, a loan repaid, a visitor leaving
 * unanswered, sleep starting (which stops a running stance and sends a
 * visitor away). Changes at the same moment happen together, in that
 * order. Each piece runs with what was true during it, so several nights in
 * one step come out the same as checking in every few seconds.
 *
 * Neglect is checked at its own moments: a vital reaching 0, then 2 h and
 * 24 h later if it's still there. Game over stops everything at its moment:
 * after it, time no longer moves him.
 */
export function advance(state: FuryoState, now: number): Outcome {
  if (state.over || now <= state.lastUpdated) return { state, events: [] }
  const events: GameEvent[] = []
  let current = trackZeros(state, state.lastUpdated)

  for (;;) {
    const hits = zeroHits(current)
    const at = Math.min(nextChangeAt(current), ...Object.values(hits).filter((t) => t !== null), ...neglectDeadlines(current))
    if (at > now) break
    const from = current.lastUpdated
    current = run(current, at, events)
    current = emptied(current, hits, at)
    current = changesAt(current, from, at, events)
    current = checkNeglect(current, at, events)
    if (current.over) break
  }
  if (!current.over) current = trackZeros(run(current, now, events), now)

  events.sort((a, b) => a.at - b.at)
  return { state: current, events }
}

/** Applies a player command at `now`, after advancing the state to `now`. */
export function apply(state: FuryoState, command: Command, now: number): Outcome {
  const advanced = advance(state, now)
  if (advanced.state.over) {
    return { state: advanced.state, events: [...advanced.events, { type: 'commandRefused', command, reason: 'gameOver', at: now }] }
  }
  if (command.type === 'answerVisitor' && advanced.events.some((e) => e.type === 'visitorLeft')) {
    return { state: advanced.state, events: [...advanced.events, { type: 'commandRefused', command, reason: 'tooLate', at: now }] }
  }
  const result = execute(advanced.state, command, now)
  return { state: trackZeros(result.state, now), events: [...advanced.events, ...result.events] }
}

/** How far the running stance is at `now`, for the client's ring and countdown. */
export function stanceProgress(state: FuryoState, now: number): { fraction: number; remainingMs: number } | null {
  const stance = state.stance
  if (!stance) return null
  const length = stance.endsAt - stance.startedAt
  const elapsed = Math.min(length, Math.max(0, now - stance.startedAt))
  return { fraction: elapsed / length, remainingMs: length - elapsed }
}

/** The next calendar event after `now`, for the "next up" line. Ties go to the balance file's order. */
export function nextCalendarEvent(state: FuryoState, now: number): { event: CalendarId; at: number } | null {
  let next: { event: CalendarId; at: number } | null = null
  for (const event of CALENDAR) {
    const at = occurrence(state, event, now)
    if (at !== null && (next === null || at < next.at)) next = { event, at }
  }
  return next
}

/** His odds of beating the Rival, from his guts and power (the balance file's weights and bounds). */
export function fightChance(state: FuryoState): number {
  const { gutsWeight, powerWeight, minChance, maxChance } = balance.visitors.kinds.rival.fight
  return Math.min(maxChance, Math.max(minChance, (state.stats.guts * gutsWeight + state.stats.power * powerWeight) / 100))
}

/** What a cart costs, at the balance file's prices. */
export function cartTotal(cart: Cart): number {
  let total = 0
  for (const [item, count] of Object.entries(cart) as [ItemId, number][]) total += balance.items[item].price * count
  return total
}

/** What a stance gives and costs in all, for one duration. */
export function stanceTotals(stance: StanceId, duration: DurationId): { gain: number; cost: number } {
  return balance.stances[stance].totals[duration]
}

/** When he wakes on his own, or null when awake. */
export function sleepProgress(state: FuryoState, now: number): { fraction: number; wakesAt: number } | null {
  const asleep = state.sleep.asleep
  if (!asleep) return null
  const length = asleep.wakesAt - asleep.since
  return { fraction: Math.min(1, Math.max(0, (now - asleep.since) / length)), wakesAt: asleep.wakesAt }
}

/**
 * When the next change after `lastUpdated` happens: the stance's end, waking
 * up or the next night's start, a calendar event, a loan coming back, or a
 * visitor's time running out.
 */
function nextChangeAt(state: FuryoState): number {
  const { stance, sleep, lastUpdated, visitor, loans } = state
  const times = [sleep.asleep ? sleep.asleep.wakesAt : nextNight(lastUpdated, sleep.window, sleep.timeZone).start]
  if (stance) times.push(stance.endsAt)
  if (visitor) times.push(visitor.leavesAt)
  for (const loan of loans) times.push(loan.repayAt)
  for (const event of CALENDAR) {
    const at = occurrence(state, event, lastUpdated)
    if (at !== null) times.push(at)
  }
  return Math.min(...times)
}

/** Everything that happens at `at` (the state is run up to it; `from` is where this step began). */
function changesAt(state: FuryoState, from: number, at: number, events: GameEvent[]): FuryoState {
  let s = state
  if (s.stance?.endsAt === at) s = endStance(s, true, at, events)
  if (s.sleep.asleep?.wakesAt === at) s = wake(s, false, at, events)
  for (const event of CALENDAR) {
    if (occurrence(s, event, from) === at) s = fireCalendar(s, event, at, events)
  }
  s = repayLoans(s, at, events)
  if (s.visitor?.leavesAt === at) s = sendAway(s, 'timeUp', at, events)
  if (!s.sleep.asleep) {
    const night = nextNight(from, s.sleep.window, s.sleep.timeZone)
    if (night.start === at) s = fallAsleep(s, night.end, at, events)
  }
  return s
}

/**
 * When each vital would reach 0 if nothing else changed: decay (slowed in
 * sleep) for the vitals the stance doesn't touch, the stance's cost for a
 * vital it pays. Rounded up to the next ms, where it's at 0 for sure.
 */
function zeroHits(state: FuryoState): Record<VitalId, number | null> {
  const hits: Record<VitalId, number | null> = { stamina: null, belly: null, style: null }
  const stance = state.stance
  const touched = stance ? touchedStats(stance.id) : []
  const factor = state.sleep.asleep ? balance.sleep.decayFactor : 1
  for (const vital of VITALS) {
    const value = state.stats[vital]
    if (value <= balance.bounds.vital.min) continue
    let rate = touched.includes(vital) ? 0 : (balance.decayPerHour[vital] * factor) / MS_PER_HOUR
    if (stance && balance.stances[stance.id].cost === vital) rate = stanceTotals(stance.id, stance.duration).cost / (stance.endsAt - stance.startedAt)
    if (stance && balance.stances[stance.id].gain === vital) rate = 0
    if (rate > 0) hits[vital] = Math.ceil(state.lastUpdated + (value - balance.bounds.vital.min) / rate)
  }
  return hits
}

/** Pins a vital due at 0 at `at` there exactly (no rounding crumbs left above it). */
function emptied(state: FuryoState, hits: Record<VitalId, number | null>, at: number): FuryoState {
  const due = VITALS.filter((v) => hits[v] === at && state.stats[v] !== balance.bounds.vital.min)
  if (due.length === 0) return state
  const stats = { ...state.stats }
  for (const v of due) stats[v] = balance.bounds.vital.min
  return { ...state, stats }
}

/** Starts a vital's stretch at 0 when it gets there, ends it when it leaves. */
function trackZeros(state: FuryoState, at: number): FuryoState {
  let changed = false
  const atZero = { ...state.neglect.atZero }
  for (const vital of VITALS) {
    const empty = state.stats[vital] <= balance.bounds.vital.min
    if (empty && !atZero[vital]) {
      atZero[vital] = { since: at, counted: false }
      changed = true
    } else if (!empty && atZero[vital]) {
      atZero[vital] = null
      changed = true
    }
  }
  return changed ? { ...state, neglect: { ...state.neglect, atZero } } : state
}

/** The neglect moments ahead: a care mistake 2 h into a stretch at 0, game over 24 h in. */
function neglectDeadlines(state: FuryoState): number[] {
  const { mistakeAfterHours, gameOverAtZeroHours } = balance.neglect
  const times: number[] = []
  for (const vital of VITALS) {
    const stretch = state.neglect.atZero[vital]
    if (!stretch) continue
    if (!stretch.counted) times.push(stretch.since + mistakeAfterHours * MS_PER_HOUR)
    times.push(stretch.since + gameOverAtZeroHours * MS_PER_HOUR)
  }
  return times
}

/** At `at`: start or end stretches at 0, log care mistakes that are due, and end the game if it's over. */
function checkNeglect(state: FuryoState, at: number, events: GameEvent[]): FuryoState {
  const { mistakeAfterHours, gameOverAtZeroHours, windowHours, gameOverMistakes } = balance.neglect
  let s = trackZeros(state, at)
  for (const vital of VITALS) {
    const stretch = s.neglect.atZero[vital]
    if (stretch && !stretch.counted && stretch.since + mistakeAfterHours * MS_PER_HOUR === at) {
      const recent = s.neglect.mistakes.filter((m) => m.at > at - windowHours * MS_PER_HOUR).length + 1
      const setback = SETBACKS[Math.min(recent, SETBACKS.length) - 1]!
      const stats = { ...s.stats }
      const changes: Partial<Record<StatId, number>> = {}
      for (const [stat, amount] of Object.entries(balance.neglect.setbacks[setback]) as [StatId, number][]) {
        const before = stats[stat]
        stats[stat] = clampStat(stat, before + amount)
        changes[stat] = stats[stat] - before
      }
      events.push({ type: 'careMistake', stat: vital, setback, changes, at })
      s = {
        ...s,
        stats,
        neglect: {
          atZero: { ...s.neglect.atZero, [vital]: { ...stretch, counted: true } },
          mistakes: [...s.neglect.mistakes, { stat: vital, setback, at }],
        },
      }
      if (recent >= gameOverMistakes) return gameOver(s, { reason: 'mistakes' }, at, events)
    }
  }
  for (const vital of VITALS) {
    const stretch = s.neglect.atZero[vital]
    if (stretch && stretch.since + gameOverAtZeroHours * MS_PER_HOUR === at) return gameOver(s, { reason: 'neglected', stat: vital }, at, events)
  }
  return s
}

function gameOver(state: FuryoState, ending: Ending, at: number, events: GameEvent[]): FuryoState {
  events.push({ type: 'gameOver', ending, at })
  return { ...state, over: { at, ending } }
}

function occurrence(state: FuryoState, event: CalendarId, after: number): number | null {
  const rule = balance.calendar[event].when as Recurrence
  return nextOccurrence(rule, after, state.sleep.timeZone, state.bornAt)
}

function fireCalendar(state: FuryoState, event: CalendarId, at: number, events: GameEvent[]): FuryoState {
  const { effects, items } = balance.calendar[event] as {
    effects: Partial<Record<StatId, number>>
    items: Partial<Record<ItemId, number>>
  }
  const changed = change(state, effects, items, at, events)
  events.push({ type: 'calendarEvent', event, changes: changed.changes, items: { ...items }, at })
  return changed.state
}

/**
 * Adds `effects` to the stats (clamped) and `items` to the inventory, at
 * `at`. Reports vitals going low or empty. Returns what actually changed.
 */
function change(
  state: FuryoState,
  effects: Partial<Record<StatId, number>>,
  items: Partial<Record<ItemId, number>>,
  at: number,
  events: GameEvent[],
): { state: FuryoState; changes: Partial<Record<StatId, number>> } {
  const stats = { ...state.stats }
  const changes: Partial<Record<StatId, number>> = {}
  for (const [stat, amount] of Object.entries(effects) as [StatId, number][]) {
    const before = stats[stat]
    stats[stat] = clampStat(stat, before + amount)
    changes[stat] = stats[stat] - before
    if (isVital(stat)) crossedAt(stat, before, stats[stat], at, events)
  }
  const inventory = { ...state.inventory }
  for (const [item, n] of Object.entries(items) as [ItemId, number][]) inventory[item] = Math.max(0, inventory[item] + n)
  return { state: { ...state, stats, inventory }, changes }
}

/** Every loan due at `at` comes back, with its bonus. */
function repayLoans(state: FuryoState, at: number, events: GameEvent[]): FuryoState {
  const due = state.loans.filter((l) => l.repayAt === at)
  if (due.length === 0) return state
  let s: FuryoState = { ...state, loans: state.loans.filter((l) => l.repayAt !== at) }
  for (const loan of due) {
    s = change(s, { yen: loan.repayment }, {}, at, events).state
    events.push({ type: 'loanRepaid', amount: loan.amount, repaid: loan.repayment, at })
  }
  return s
}

/** The waiting visitor leaves unanswered, with no effect. */
function sendAway(state: FuryoState, reason: 'timeUp' | 'asleep' | 'out', at: number, events: GameEvent[]): FuryoState {
  if (!state.visitor) return state
  events.push({ type: 'visitorLeft', visitor: state.visitor.id, reason, at })
  return { ...state, visitor: null }
}

/** The visitor's answer: its outcome and what it changes, rolling the seed when chance is involved. */
function answer(state: FuryoState, visitor: VisitorId, response: VisitorResponse, at: number): { outcome: VisitorOutcome; effects: Partial<Record<StatId, number>>; items: Partial<Record<ItemId, number>>; seed: number; loan?: Loan } | RefusalReason {
  const kinds = balance.visitors.kinds
  const none = { effects: {}, items: {}, seed: state.seed }
  switch (response) {
    case 'fight': {
      const { win, lose } = kinds.rival.fight
      const chance = fightChance(state)
      const { value, seed } = roll(state.seed)
      const won = value < chance
      return { outcome: { kind: 'fight', won, chance, roll: value }, effects: won ? win : lose, items: {}, seed }
    }
    case 'backOff':
      return { ...none, outcome: { kind: 'backedOff' } }
    case 'lend': {
      const { amount, bonus, repayAfterHours } = kinds.friend.loan
      if (state.stats.yen < amount) return 'notEnoughYen'
      const loan: Loan = { amount, repayment: amount + bonus, lentAt: at, repayAt: at + repayAfterHours * MS_PER_HOUR }
      return { ...none, outcome: { kind: 'lent', loan }, effects: { yen: -amount }, loan }
    }
    case 'refuse':
      return { ...none, outcome: { kind: 'refused' }, effects: kinds.friend.refuse }
    case 'comply': {
      const fined = state.stats.style < kinds.cop.styleBelow
      return { ...none, outcome: { kind: 'checked', fined }, effects: fined ? kinds.cop.fine : {} }
    }
    case 'feed': {
      const food = kinds.stray.food
      if (state.inventory[food] <= 0) return 'noneLeft'
      return { ...none, outcome: { kind: 'fed' }, effects: kinds.stray.effects, items: { [food]: -1 } }
    }
    case 'ignore':
      return { ...none, outcome: { kind: 'ignored' } }
    case 'accept': {
      const list = kinds.delivery.items
      const { value, seed } = roll(state.seed)
      const item = list[Math.min(list.length - 1, Math.floor(value * list.length))]!
      return { outcome: { kind: 'delivered', item }, effects: {}, items: { [item]: 1 }, seed }
    }
  }
}

/** Sleep starts at `at`: a running stance stops first, keeping what it gave. */
function fallAsleep(state: FuryoState, wakesAt: number, at: number, events: GameEvent[]): FuryoState {
  const stopped = sendAway(endStance(state, false, at, events), 'asleep', at, events)
  events.push({ type: 'fellAsleep', wakesAt, at })
  return { ...stopped, sleep: { ...stopped.sleep, asleep: { since: at, wakesAt } } }
}

/** Sleep ends at `at`, with the natural or early wake effects. */
function wake(state: FuryoState, early: boolean, at: number, events: GameEvent[]): FuryoState {
  const effects = early ? balance.sleep.earlyWake : balance.sleep.naturalWake
  const stats = { ...state.stats }
  for (const vital of VITALS) {
    const before = stats[vital]
    stats[vital] = clampStat(vital, before + effects[vital])
    crossedAt(vital, before, stats[vital], at, events)
  }
  events.push({ type: 'wokeUp', early, at })
  return { ...state, stats, sleep: { ...state.sleep, asleep: null } }
}

/**
 * Moves time from `lastUpdated` to `until` with nothing starting or ending
 * in between: decay for every vital the stance doesn't touch (slowed while
 * he sleeps), and the stance's gain and cost along their curves.
 */
function run(state: FuryoState, until: number, events: GameEvent[]): FuryoState {
  const from = state.lastUpdated
  if (until <= from) return state
  const stats = { ...state.stats }
  const stance = state.stance
  const touched = stance ? touchedStats(stance.id) : []
  const factor = state.sleep.asleep ? balance.sleep.decayFactor : 1

  for (const vital of VITALS) {
    if (touched.includes(vital)) continue
    const rate = (balance.decayPerHour[vital] * factor) / MS_PER_HOUR
    crossing(vital, stats[vital], rate, from, until, events)
    stats[vital] = clampStat(vital, stats[vital] - rate * (until - from))
  }

  if (stance) {
    const { gain, cost } = balance.stances[stance.id]
    const { gain: gainTotal, cost: costTotal } = stanceTotals(stance.id, stance.duration)
    const p0 = fraction(stance, from)
    const p1 = fraction(stance, until)
    stats[gain] = clampStat(gain, stats[gain] + gainTotal * (backLoaded(p1) - backLoaded(p0)))
    const costRate = costTotal / (stance.endsAt - stance.startedAt)
    if (isVital(cost)) crossing(cost, stats[cost], costRate, from, until, events)
    stats[cost] = clampStat(cost, stats[cost] - costTotal * (p1 - p0))
  }

  return { ...state, stats, lastUpdated: until }
}

/** The lines a falling vital reports when it goes below them: low, then empty. */
const LINES = [
  { type: 'vitalLow', level: balance.lowVital },
  { type: 'vitalEmptied', level: balance.bounds.vital.min },
] as const

/** Reports each line a vital falling from `value` at `rate` (points per ms) crosses by `until`, at the exact time. */
function crossing(stat: VitalId, value: number, rate: number, from: number, until: number, events: GameEvent[]) {
  if (rate <= 0) return
  for (const { type, level } of LINES) {
    if (value <= level) continue
    const at = from + (value - level) / rate
    if (at <= until) events.push({ type, stat, at: Math.round(at) })
  }
}

/** Reports each line a vital's instant change from `before` to `after` crosses. */
function crossedAt(stat: VitalId, before: number, after: number, at: number, events: GameEvent[]) {
  for (const { type, level } of LINES) if (before > level && after <= level) events.push({ type, stat, at })
}

function isVital(stat: StatId): stat is VitalId {
  return (VITALS as readonly StatId[]).includes(stat)
}

/** How far through its time the stance is at `t`, 0 to 1. */
function fraction(stance: ActiveStance, t: number): number {
  return Math.min(1, Math.max(0, (t - stance.startedAt) / (stance.endsAt - stance.startedAt)))
}

function backLoaded(p: number): number {
  return (Math.exp(p) - 1) / (Math.E - 1)
}

function touchedStats(stance: StanceId): StatId[] {
  const { gain, cost } = balance.stances[stance]
  return [gain, cost]
}

function endStance(state: FuryoState, completed: boolean, at: number, events: GameEvent[]): FuryoState {
  const stance = state.stance
  if (!stance) return state
  const { gain: gainTotal, cost: costTotal } = stanceTotals(stance.id, stance.duration)
  const p = fraction(stance, at)
  events.push({
    type: 'stanceEnded',
    stance: stance.id,
    completed,
    gained: gainTotal * backLoaded(p),
    paid: costTotal * p,
    at,
  })
  return { ...state, stance: null }
}

function execute(state: FuryoState, command: Command, now: number): Outcome {
  const refuse = (reason: RefusalReason): Outcome => ({
    state,
    events: [{ type: 'commandRefused', command, reason, at: now }],
  })

  switch (command.type) {
    case 'useItem': {
      const owned = state.inventory[command.item]
      if (owned <= 0) return refuse('noneLeft')
      const { stat, amount } = balance.items[command.item]
      return {
        state: {
          ...state,
          stats: { ...state.stats, [stat]: clampStat(stat, state.stats[stat] + amount) },
          inventory: { ...state.inventory, [command.item]: owned - 1 },
        },
        events: [{ type: 'itemUsed', item: command.item, stat, amount, at: now }],
      }
    }

    case 'buy': {
      const counts = Object.entries(command.cart) as [ItemId, number][]
      const valid = counts.every(([, n]) => Number.isInteger(n) && n >= 0)
      if (!valid || counts.every(([, n]) => n === 0)) return refuse('emptyCart')
      const total = cartTotal(command.cart)
      if (total > state.stats.yen) return refuse('notEnoughYen')
      const inventory = { ...state.inventory }
      for (const [item, n] of counts) inventory[item] += n
      return {
        state: { ...state, stats: { ...state.stats, yen: state.stats.yen - total }, inventory },
        events: [{ type: 'bought', cart: command.cart, total, at: now }],
      }
    }

    case 'startStance': {
      if (state.sleep.asleep) return refuse('asleep')
      if (state.stance) return refuse('stanceRunning')
      const endsAt = now + balance.durations[command.duration] * MS_PER_MINUTE
      const events: GameEvent[] = [{ type: 'stanceStarted', stance: command.stance, duration: command.duration, at: now }]
      // Out of the door for an off-screen stance: a waiting visitor gives up.
      const started = { ...state, stance: { id: command.stance, duration: command.duration, startedAt: now, endsAt } }
      const next = balance.stances[command.stance].spot === null ? sendAway(started, 'out', now, events) : started
      return { state: next, events }
    }

    case 'stopStance': {
      if (!state.stance) return refuse('noStance')
      const events: GameEvent[] = []
      return { state: endStance(state, false, now, events), events }
    }

    case 'wakeUp': {
      if (!state.sleep.asleep) return refuse('notAsleep')
      const events: GameEvent[] = []
      return { state: wake(state, true, now, events), events }
    }

    case 'setSleepWindow': {
      const { window, timeZone } = command
      if (!isValidWindow(window) || !isTimeZone(timeZone)) return refuse('badWindow')
      const old = state.sleep
      const changed = old.window.start !== window.start || old.window.end !== window.end || old.timeZone !== timeZone
      const events: GameEvent[] = [{ type: 'sleepWindowSet', window: { ...window }, timeZone, at: now }]
      let next: FuryoState = { ...state, sleep: { ...old, window: { ...window }, timeZone } }
      const night = nightAt(now, window, timeZone)
      if (old.asleep) {
        if (night) next = { ...next, sleep: { ...next.sleep, asleep: { since: old.asleep.since, wakesAt: night.end } } }
        else next = wake(next, true, now, events)
      } else if (night && changed) {
        next = fallAsleep(next, night.end, now, events)
      }
      return { state: next, events }
    }

    case 'visitorArrives': {
      if (state.sleep.asleep) return refuse('asleep')
      if (state.stance && balance.stances[state.stance.id].spot === null) return refuse('out')
      if (state.visitor) return refuse('visitorPresent')
      const leavesAt = now + balance.visitors.windowMinutes * MS_PER_MINUTE
      return {
        state: { ...state, visitor: { id: command.visitor, arrivedAt: now, leavesAt } },
        events: [{ type: 'visitorArrived', visitor: command.visitor, leavesAt, at: now }],
      }
    }

    case 'answerVisitor': {
      const visitor = state.visitor
      if (!visitor) return refuse('noVisitor')
      if (!(VISITOR_RESPONSES[visitor.id] as readonly string[]).includes(command.response)) return refuse('badResponse')
      const result = answer(state, visitor.id, command.response, now)
      if (typeof result === 'string') return refuse(result)
      const events: GameEvent[] = []
      const changed = change({ ...state, seed: result.seed }, result.effects, result.items, now, events)
      const loans = result.loan ? [...state.loans, result.loan] : state.loans
      events.push({ type: 'visitorAnswered', visitor: visitor.id, response: command.response, outcome: result.outcome, changes: changed.changes, items: result.items, at: now })
      return { state: { ...changed.state, visitor: null, loans }, events }
    }
  }
}

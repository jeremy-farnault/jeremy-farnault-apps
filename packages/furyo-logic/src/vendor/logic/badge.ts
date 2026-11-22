import { balance } from '../balance/balance'
import { advance } from './game'
import { migrate, VITALS } from './state'

/** What the badge in the monorepo apps shows, from the stored save. */
export type BadgeStatus =
  /** A furyo: his name, and whether a vital is below the low line (the red dot). */
  | { status: 'furyo'; name: string; needsYou: boolean; over: boolean }
  /** A save this copy of the logic can't read (the game moved to a newer state version): no red dot. */
  | { status: 'unknown' }

/**
 * Catches the stored furyo up to `now` (without saving it) and says whether he needs you:
 * a vital below `balance.lowVital`, or his game over. Takes the save as stored, so a
 * caller with an older copy of the logic gets `unknown` rather than an error.
 */
export function badgeStatus(stored: unknown, now: number): BadgeStatus {
  const state = migrate(stored)
  if (!state) return { status: 'unknown' }
  const caughtUp = advance(state, Math.max(now, state.lastUpdated)).state
  const low = VITALS.some((v) => caughtUp.stats[v] < balance.lowVital)
  const over = caughtUp.over !== null
  return { status: 'furyo', name: caughtUp.name, needsYou: low || over, over }
}

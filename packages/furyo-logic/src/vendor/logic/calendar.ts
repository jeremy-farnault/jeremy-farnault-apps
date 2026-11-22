/**
 * When calendar events happen. Times are local, in the furyo's time zone
 * (the one his sleep window uses). Pure: `after` and the rule come in, the
 * next moment comes out.
 */
import { localDay, moment, MS_PER_DAY, MS_PER_MINUTE } from './localTime'

/** `time` is minutes after local midnight. `weekday` is 0 for Sunday. */
export type Recurrence =
  | { every: 'day'; time: number }
  | { every: 'week'; weekday: number; time: number }
  | { every: 'month'; day: number; time: number }
  /** Once, this many minutes after the furyo was born. */
  | { once: 'afterBirth'; minutes: number }

/** The first time the rule happens strictly after `after`, or null if it never will again. */
export function nextOccurrence(rule: Recurrence, after: number, timeZone: string, bornAt: number): number | null {
  if ('once' in rule) {
    const at = bornAt + rule.minutes * MS_PER_MINUTE
    return at > after ? at : null
  }
  const today = localDay(after, timeZone)
  const at = (day: number) => moment(day + rule.time * MS_PER_MINUTE, timeZone)
  const candidates: number[] = []
  if (rule.every === 'day') {
    for (const d of [-1, 0, 1, 2]) candidates.push(at(today + d * MS_PER_DAY))
  } else if (rule.every === 'week') {
    for (let d = -1; d <= 8; d++) {
      const day = today + d * MS_PER_DAY
      if (new Date(day).getUTCDay() === rule.weekday) candidates.push(at(day))
    }
  } else {
    const date = new Date(today)
    for (const m of [-1, 0, 1, 2]) candidates.push(at(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + m, rule.day)))
  }
  return candidates.find((t) => t > after) ?? null
}

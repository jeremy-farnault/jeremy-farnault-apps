/**
 * The sleep window in local time, turned into epoch ms. Pure: the window and
 * its IANA time zone come from the state, and Intl turns wall-clock times into
 * moments (so daylight saving is handled by the time zone database).
 */

import { localDay, MINUTES_PER_DAY, moment, MS_PER_DAY, MS_PER_MINUTE } from './localTime'

export { isTimeZone, MINUTES_PER_DAY } from './localTime'

/** Minutes after local midnight: 23:00 is 1380. The window may cross midnight (start > end). */
export interface SleepWindow {
  start: number
  end: number
}

/** One night: from the window's start on one local day to its end. */
export interface Night {
  start: number
  end: number
}

/** The night whose window starts on the local day `dayWall` (midnight, as UTC) is on. */
function nightOf(dayWall: number, window: SleepWindow, timeZone: string): Night {
  const start = moment(dayWall + window.start * MS_PER_MINUTE, timeZone)
  const endDay = window.end > window.start ? dayWall : dayWall + MS_PER_DAY
  return { start, end: moment(endDay + window.end * MS_PER_MINUTE, timeZone) }
}

/** The nights starting the local day before `t`, that day and the two after, in order. */
function nightsAround(t: number, window: SleepWindow, timeZone: string): Night[] {
  const day = localDay(t, timeZone)
  return [-1, 0, 1, 2].map((d) => nightOf(day + d * MS_PER_DAY, window, timeZone))
}

/** The first night that starts strictly after `t`. */
export function nextNight(t: number, window: SleepWindow, timeZone: string): Night {
  return nightsAround(t, window, timeZone).find((n) => n.start > t)!
}

/** The night `t` falls in (start ≤ t < end), or null when it's daytime. */
export function nightAt(t: number, window: SleepWindow, timeZone: string): Night | null {
  return nightsAround(t, window, timeZone).find((n) => n.start <= t && t < n.end) ?? null
}

/** A window is whole minutes inside one day, and its start isn't its end. */
export function isValidWindow(window: SleepWindow): boolean {
  const inDay = (m: number) => Number.isInteger(m) && m >= 0 && m < MINUTES_PER_DAY
  return inDay(window.start) && inDay(window.end) && window.start !== window.end
}

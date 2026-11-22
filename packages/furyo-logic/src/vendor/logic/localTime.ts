/**
 * Local wall-clock time in an IANA time zone, for the sleep window and the
 * calendar. Pure: Intl and the time zone database turn wall-clock times into
 * moments, so daylight saving is handled. A "wall" time is the local date and
 * time written as if it were UTC (local midnight of a day is a multiple of a day).
 */

export const MS_PER_MINUTE = 60 * 1000
export const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE
export const MINUTES_PER_DAY = 24 * 60

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, f)
  }
  return f
}

/** Whether Intl knows this IANA time zone. */
export function isTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** The wall-clock time at `t` in `timeZone`, written as if it were UTC. */
export function wallClock(t: number, timeZone: string): number {
  const parts: Record<string, number> = {}
  for (const { type, value } of formatter(timeZone).formatToParts(t)) parts[type] = Number(value)
  return Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!)
}

/** The time zone's offset from UTC at `t`, in ms (Stockholm: +1 h in winter, +2 h in summer). */
function offsetAt(t: number, timeZone: string): number {
  const whole = Math.floor(t / 1000) * 1000
  return wallClock(whole, timeZone) - whole
}

/**
 * The moment a wall-clock time (written as UTC) happens in `timeZone`. When
 * the clocks go back and it happens twice, the first. When they go forward
 * and it never happens, the same distance past the jump (02:30 → 03:30).
 */
export function moment(wall: number, timeZone: string): number {
  const before = offsetAt(wall - MS_PER_DAY / 2, timeZone)
  const after = offsetAt(wall + MS_PER_DAY / 2, timeZone)
  const candidates = [wall - before, wall - after].filter((t) => wallClock(t, timeZone) === wall)
  if (candidates.length > 0) return Math.min(...candidates)
  return wall - before
}

/** Local midnight of the day `t` falls on, as a wall time. */
export function localDay(t: number, timeZone: string): number {
  const wall = wallClock(t, timeZone)
  return wall - (((wall % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY)
}

/**
 * Drift is how far a person has slipped: the time since their most recent touch.
 *
 * It is a pure function of touch history, computed at render time — there is no stored
 * status column, no cadence target, and no background job. A person who has never been
 * touched is maximally drifted, so newly-added people surface rather than hide.
 */

/** Sentinel drift for a person with no touches at all. */
export const MAX_DRIFT_DAYS = Number.POSITIVE_INFINITY;

const MS_PER_DAY = 86_400_000;

/** Local midnight for a date, so drift counts calendar days rather than 24h periods. */
function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Whole calendar days between the last touch and now, or `MAX_DRIFT_DAYS` when the
 * person has never been touched. Rounds the day difference so a DST shift doesn't
 * knock the count off by one. Never negative: a touch stamped later today reads as 0.
 */
export function driftDays(lastTouchAt: Date | null, now: Date): number {
  if (!lastTouchAt) return MAX_DRIFT_DAYS;
  const days = Math.round((startOfDay(now) - startOfDay(lastTouchAt)) / MS_PER_DAY);
  return Math.max(0, days);
}

/**
 * Human "time ago" label for a past date, counted in calendar days — e.g. "3 weeks ago".
 * Shared by drift and by the critical flag's age.
 */
export function formatAgo(date: Date, now: Date): string {
  const days = driftDays(date, now);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Human label for a person's drift. A person who has never been touched reads as
 * maximally drifted rather than blank, so new people surface instead of hiding.
 */
export function formatDrift(lastTouchAt: Date | null, now: Date): string {
  if (!lastTouchAt) return "Never in touch";
  return formatAgo(lastTouchAt, now);
}

/** The most recent `occurredAt` in a touch list, or null when there are none. */
export function lastTouchAt(touches: { occurredAt: Date }[]): Date | null {
  let latest: Date | null = null;
  for (const touch of touches) {
    if (!latest || touch.occurredAt.getTime() > latest.getTime()) latest = touch.occurredAt;
  }
  return latest;
}

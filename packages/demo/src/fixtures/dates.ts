/** A calendar date as stored in `date` columns: `YYYY-MM-DD`. */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function assertIsoDate(value: string): IsoDate {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`Expected a YYYY-MM-DD date, got "${value}"`);
  }
  return value;
}

/** The date `days` days after `date` (negative goes back). Calendar maths in UTC, no DST drift. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const time = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

/** A timestamp on `date` at the given UTC hour, for `timestamp` columns. */
export function atHour(date: IsoDate, hour: number): Date {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
}

/** Today's date in Stockholm, where the apps' users live. */
export function todayInStockholm(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(now);
}

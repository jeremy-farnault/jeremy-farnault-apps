const MS_PER_DAY = 86_400_000;

export type CyclePattern = {
  cycleStartDate: string;
  daysOn: number;
  daysOff: number;
};

export type DayOverride = {
  isOn: boolean;
};

function toEpochDay(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year as number, (month as number) - 1, day as number) / MS_PER_DAY;
}

function fromEpochDay(epochDay: number): string {
  const date = new Date(epochDay * MS_PER_DAY);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** All ISO dates from startDate to endDate, inclusive. */
export function datesInRange(startDate: string, endDate: string): string[] {
  const start = toEpochDay(startDate);
  const end = toEpochDay(endDate);
  const dates: string[] = [];
  for (let day = start; day <= end; day++) {
    dates.push(fromEpochDay(day));
  }
  return dates;
}

/** Pure on/off computation from a Medicine's recurring cycle pattern — no overrides. */
export function computeOnOff(pattern: CyclePattern, date: string): boolean {
  const cycleLength = pattern.daysOn + pattern.daysOff;
  const offset = toEpochDay(date) - toEpochDay(pattern.cycleStartDate);
  const cycleDay = ((offset % cycleLength) + cycleLength) % cycleLength;
  return cycleDay < pattern.daysOn;
}

/** Resolves the final on/off state for a day, letting a manual override win over the computed value. */
export function resolveOnOff(
  pattern: CyclePattern,
  date: string,
  override: DayOverride | undefined
): boolean {
  if (override) return override.isOn;
  return computeOnOff(pattern, date);
}

/** ISO start/end dates (inclusive) for a given calendar month. Month is 1-indexed (1 = January). */
export function getMonthBounds(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${year}-${pad2(month)}-01`,
    endDate: `${year}-${pad2(month)}-${pad2(daysInMonth)}`,
  };
}

export type YearMonth = { year: number; month: number };

/** Shifts a calendar month by delta (positive or negative), correctly rolling over year boundaries. */
export function addMonths(year: number, month: number, delta: number): YearMonth {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Parses a "YYYY-MM" search param, falling back to the given value if missing or malformed. */
export function parseMonthParam(param: string | undefined, fallback: YearMonth): YearMonth {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number) as [number, number];
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }
  return fallback;
}

/** Formats a calendar month for display, e.g. "June 2026". Always UTC — avoids local-timezone
 * reinterpretation shifting the displayed month at the day-1 boundary. */
export function formatMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats an ISO date for display, e.g. "June 14, 2026". Always UTC, same reasoning as formatMonthLabel. */
export function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

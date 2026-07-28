const MS_PER_DAY = 86_400_000;

export type PillType = {
  id: string;
  name: string | null;
  color: string;
  days: number;
};

export type CyclePattern = {
  cycleStartDate: string;
  types: PillType[];
  daysOff: number;
};

export type DayOverride = {
  isOn: boolean;
};

export type ResolvedDay = {
  isOn: boolean;
  type: PillType | null;
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

function totalOnDays(types: PillType[]): number {
  return types.reduce((sum, type) => sum + type.days, 0);
}

/** Which type covers a given 0-based offset into the "on" rotation (0 <= onDayIndex < total on days). */
function typeAtOnDayIndex(types: PillType[], onDayIndex: number): PillType {
  let remaining = onDayIndex;
  for (const type of types) {
    if (remaining < type.days) return type;
    remaining -= type.days;
  }
  throw new Error("onDayIndex out of range for the given pill types");
}

/** Pure computation of the active pill type for a date, or null on an off day — no overrides. */
export function computeActiveType(pattern: CyclePattern, date: string): PillType | null {
  const onLength = totalOnDays(pattern.types);
  const cycleLength = onLength + pattern.daysOff;
  const offset = toEpochDay(date) - toEpochDay(pattern.cycleStartDate);
  const cycleDay = ((offset % cycleLength) + cycleLength) % cycleLength;
  if (cycleDay >= onLength) return null;
  return typeAtOnDayIndex(pattern.types, cycleDay);
}

/**
 * Same type rotation, but wrapped within just the "on" portion regardless of daysOff. Used to pick
 * a deterministic type when a normally-off day is manually overridden on — the type sequence keeps
 * rotating independently of how many off days separate cycles.
 */
export function computeWrappedType(pattern: CyclePattern, date: string): PillType {
  const onLength = totalOnDays(pattern.types);
  const offset = toEpochDay(date) - toEpochDay(pattern.cycleStartDate);
  const wrappedDay = ((offset % onLength) + onLength) % onLength;
  return typeAtOnDayIndex(pattern.types, wrappedDay);
}

/** Resolves the final on/off + active-type state for a day, letting a manual override win. */
export function resolveDay(
  pattern: CyclePattern,
  date: string,
  override: DayOverride | undefined
): ResolvedDay {
  if (override) {
    return {
      isOn: override.isOn,
      type: override.isOn ? computeWrappedType(pattern, date) : null,
    };
  }
  const type = computeActiveType(pattern, date);
  return { isOn: type !== null, type };
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

/** Monday-first weekday index for a date: 0 = Monday ... 6 = Sunday. */
function mondayFirstWeekday(date: string): number {
  const jsWeekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return (jsWeekday + 6) % 7;
}

export type GridPosition = {
  row: number;
  column: number;
};

/**
 * Weekday row (0 = Monday .. 6 = Sunday) and week-of-month column for a date, for laying out a
 * Monday-first calendar grid — column 0 is the week containing the 1st of the month.
 */
export function getGridPosition(date: string): GridPosition {
  const dayOfMonth = Number(date.slice(-2));
  const firstOfMonth = `${date.slice(0, 7)}-01`;
  const firstWeekday = mondayFirstWeekday(firstOfMonth);
  return {
    row: mondayFirstWeekday(date),
    column: Math.floor((dayOfMonth - 1 + firstWeekday) / 7),
  };
}

/** Total grid columns (weeks) needed to lay out a calendar month, Monday-first. */
export function getGridColumnCount(year: number, month: number): number {
  const { endDate } = getMonthBounds(year, month);
  const lastDayOfMonth = Number(endDate.slice(-2));
  const firstWeekday = mondayFirstWeekday(`${endDate.slice(0, 7)}-01`);
  return Math.floor((lastDayOfMonth - 1 + firstWeekday) / 7) + 1;
}

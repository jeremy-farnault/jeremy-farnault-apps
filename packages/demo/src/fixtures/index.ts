import { type IsoDate, assertIsoDate } from "./dates";
import { type RoutinerFixtures, buildRoutinerFixtures } from "./routiner";

export interface DemoFixtures {
  routiner: RoutinerFixtures;
}

export type DemoApp = keyof DemoFixtures;

export const DEMO_APPS = ["routiner"] as const satisfies readonly DemoApp[];

/**
 * Every app's rows for the demo user, dated relative to `today`. Pure: no database, no clock,
 * and the same inputs always give the same output. Shared rows (Gainer's predefined exercises,
 * exchange rates) are never included; fixtures reference them by natural key instead.
 */
export function buildDemoFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): DemoFixtures {
  const input = { userId, today: assertIsoDate(today) };
  return {
    routiner: buildRoutinerFixtures(input),
  };
}

export type { IsoDate } from "./dates";
export { addDays, todayInStockholm } from "./dates";

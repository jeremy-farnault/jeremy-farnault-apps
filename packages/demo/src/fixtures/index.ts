import { type ClasserFixtures, buildClasserFixtures } from "./classer";
import { type IsoDate, assertIsoDate } from "./dates";
import { type DoserFixtures, buildDoserFixtures } from "./doser";
import { type FinancerFixtures, buildFinancerFixtures } from "./financer";
import { type GainerFixtures, buildGainerFixtures } from "./gainer";
import { type JournalerFixtures, buildJournalerFixtures } from "./journaler";
import { type RoutinerFixtures, buildRoutinerFixtures } from "./routiner";

export interface DemoFixtures {
  classer: ClasserFixtures;
  doser: DoserFixtures;
  financer: FinancerFixtures;
  gainer: GainerFixtures;
  journaler: JournalerFixtures;
  routiner: RoutinerFixtures;
}

export type DemoApp = keyof DemoFixtures;

export const DEMO_APPS = [
  "classer",
  "doser",
  "financer",
  "gainer",
  "journaler",
  "routiner",
] as const satisfies readonly DemoApp[];

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
    classer: buildClasserFixtures(input),
    doser: buildDoserFixtures(input),
    financer: buildFinancerFixtures(input),
    gainer: buildGainerFixtures(input),
    journaler: buildJournalerFixtures(input),
    routiner: buildRoutinerFixtures(input),
  };
}

export type { IsoDate } from "./dates";
export { addDays, todayInStockholm } from "./dates";

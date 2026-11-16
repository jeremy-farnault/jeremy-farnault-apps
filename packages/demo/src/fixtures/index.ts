import { type ClasserFixtures, buildClasserFixtures } from "./classer";
import { type IsoDate, assertIsoDate } from "./dates";
import { type DoserFixtures, buildDoserFixtures } from "./doser";
import { type FinancerFixtures, buildFinancerFixtures } from "./financer";
import { type GainerFixtures, buildGainerFixtures } from "./gainer";
import { type JournalerFixtures, buildJournalerFixtures } from "./journaler";
import { type NoterFixtures, buildNoterFixtures } from "./noter";
import { type OrganiserFixtures, buildOrganiserFixtures } from "./organiser";
import { type PlacerFixtures, buildPlacerFixtures } from "./placer";
import { type RoutinerFixtures, buildRoutinerFixtures } from "./routiner";
import { type UnifierFixtures, buildUnifierFixtures } from "./unifier";

export interface DemoFixtures {
  classer: ClasserFixtures;
  doser: DoserFixtures;
  financer: FinancerFixtures;
  gainer: GainerFixtures;
  journaler: JournalerFixtures;
  noter: NoterFixtures;
  organiser: OrganiserFixtures;
  placer: PlacerFixtures;
  routiner: RoutinerFixtures;
  unifier: UnifierFixtures;
}

export type DemoApp = keyof DemoFixtures;

export const DEMO_APPS = [
  "classer",
  "doser",
  "financer",
  "gainer",
  "journaler",
  "noter",
  "organiser",
  "placer",
  "routiner",
  "unifier",
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
    noter: buildNoterFixtures(input),
    organiser: buildOrganiserFixtures(input),
    placer: buildPlacerFixtures(input),
    routiner: buildRoutinerFixtures(input),
    unifier: buildUnifierFixtures(input),
  };
}

export type { IsoDate } from "./dates";
export { addDays, todayInStockholm } from "./dates";

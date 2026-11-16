import type {
  unifierArcs,
  unifierPersons,
  unifierSlotValues,
  unifierSlots,
  unifierTouches,
} from "@jf/db";
import { seedKeys } from "./ordering";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";

export interface UnifierFixtures {
  arcs: (typeof unifierArcs.$inferInsert)[];
  slots: (typeof unifierSlots.$inferInsert)[];
  persons: (typeof unifierPersons.$inferInsert)[];
  slotValues: (typeof unifierSlotValues.$inferInsert)[];
  touches: (typeof unifierTouches.$inferInsert)[];
}

interface PersonSpec {
  name: string;
  note?: string;
  /** Flagged as critical this many days ago. */
  importantDaysAgo?: number;
  /** Days ago of each contact, newest first; empty means never touched. */
  touches: number[];
  /** Touch notes, by days ago. */
  touchNotes?: Record<number, string>;
  /** Values for the arc's slots, in slot order. */
  values: (string | null)[];
}

interface ArcSpec {
  key: string;
  name: string;
  color: string;
  slots: string[];
  people: PersonSpec[];
}

// Invented people. Drift is the time since the last touch, so the touch lists spread people
// from "today" to "never" across the orbit.
const ARCS: ArcSpec[] = [
  {
    key: "family",
    name: "Family",
    color: "var(--teal-600)",
    slots: ["Birthday", "Lives in"],
    people: [
      {
        name: "Maman",
        touches: [1, 8, 15, 22, 36],
        touchNotes: { 1: "Sunday call" },
        values: ["14 March", "Lyon"],
      },
      { name: "Papa", touches: [8, 22, 50], values: ["2 August", "Lyon"] },
      {
        name: "Camille",
        note: "Expecting her second in spring.",
        importantDaysAgo: 4,
        touches: [4, 40],
        touchNotes: { 4: "Voice notes about baby names" },
        values: ["29 June", "Bordeaux"],
      },
      { name: "Uncle Gérard", touches: [120], values: [null, "Marseille"] },
    ],
  },
  {
    key: "friends",
    name: "Friends",
    color: "var(--purple-400)",
    slots: ["Birthday", "Partner", "Kids"],
    people: [
      {
        name: "Erik Lindqvist",
        touches: [2, 16, 30],
        touchNotes: { 2: "Climbing at Klättercentret" },
        values: ["11 May", "Sara", "Two, 4 and 7"],
      },
      {
        name: "Aiko Tanaka",
        note: "Moved back to Osaka in May.",
        touches: [26, 95],
        values: ["3 October", null, null],
      },
      {
        name: "Tama Ngata",
        touches: [60, 210],
        touchNotes: { 60: "Video call, he's guiding on the Routeburn again" },
        values: ["21 January", "Mere", "One, 2"],
      },
      {
        name: "Lucie Moreau",
        importantDaysAgo: 10,
        note: "Job interview in Stockholm next month.",
        touches: [10, 45],
        values: ["8 December", null, null],
      },
      { name: "Johan Berg", touches: [6, 33], values: [null, "Anna", null] },
      { name: "Ravi Menon", touches: [], values: ["17 April", null, null] },
    ],
  },
  {
    key: "work",
    name: "Work",
    color: "var(--blue-400)",
    slots: ["Team", "Role"],
    people: [
      {
        name: "Sofia Andersson",
        touches: [0, 7, 14],
        touchNotes: { 0: "1:1, career plan" },
        values: ["Platform", "Senior engineer"],
      },
      { name: "Marcus Holm", touches: [3, 17], values: ["Mobile", "Engineer"] },
      {
        name: "Elin Nyström",
        importantDaysAgo: 2,
        note: "Back from parental leave on the 1st.",
        touches: [2, 70],
        values: ["Mobile", "Tech lead"],
      },
      { name: "Dev Patel", touches: [21], values: ["Data", "Engineering manager"] },
      { name: "Hanna Ek", touches: [44], values: ["Design", "Product designer"] },
    ],
  },
  {
    key: "volunteering",
    name: "Volunteering",
    color: "var(--magenta-400)",
    slots: ["Project"],
    people: [
      { name: "Grace Owusu", touches: [12, 40], values: ["Mobile app"] },
      { name: "Nadia Haddad", touches: [85], values: ["Comms"] },
    ],
  },
];

export function buildUnifierFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): UnifierFixtures {
  const id = (key: string) => stableUuid(userId, `unifier:${key}`);
  const createdAt = atHour(addDays(today, -365), 10);
  const fixtures: UnifierFixtures = {
    arcs: [],
    slots: [],
    persons: [],
    slotValues: [],
    touches: [],
  };

  const arcKeys = seedKeys(ARCS.length);
  ARCS.forEach((arc, arcIndex) => {
    const arcId = id(`arc:${arc.key}`);
    fixtures.arcs.push({
      id: arcId,
      userId,
      name: arc.name,
      color: arc.color,
      position: arcKeys[arcIndex] as string,
      createdAt,
      updatedAt: createdAt,
    });

    const slotKeys = seedKeys(arc.slots.length);
    const slotIds = arc.slots.map((label, slotIndex) => {
      const slotId = id(`slot:${arc.key}:${label}`);
      fixtures.slots.push({
        id: slotId,
        arcId,
        userId,
        label,
        position: slotKeys[slotIndex] as string,
        createdAt,
        updatedAt: createdAt,
      });
      return slotId;
    });

    for (const person of arc.people) {
      const personId = id(`person:${person.name}`);
      const flaggedAt =
        person.importantDaysAgo === undefined
          ? null
          : atHour(addDays(today, -person.importantDaysAgo), 9);
      fixtures.persons.push({
        id: personId,
        arcId,
        userId,
        name: person.name,
        avatarKey: null,
        color: null,
        note: person.note ?? null,
        important: flaggedAt !== null,
        flaggedAt,
        createdAt,
        updatedAt: flaggedAt ?? createdAt,
      });
      person.values.forEach((value, slotIndex) => {
        if (value === null) return;
        fixtures.slotValues.push({
          id: id(`value:${person.name}:${slotIndex}`),
          personId,
          slotId: slotIds[slotIndex] as string,
          userId,
          value,
        });
      });
      for (const daysAgo of person.touches) {
        // Today's touch happened this morning, so it never lands after "now".
        const occurredAt = atHour(addDays(today, -daysAgo), daysAgo === 0 ? 6 : 17);
        fixtures.touches.push({
          id: id(`touch:${person.name}:${daysAgo}`),
          personId,
          userId,
          note: person.touchNotes?.[daysAgo] ?? null,
          occurredAt,
          createdAt: occurredAt,
        });
      }
    }
  });

  return fixtures;
}

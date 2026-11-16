import type {
  organiserBoards,
  organiserCardTags,
  organiserCards,
  organiserColumns,
  organiserTags,
} from "@jf/db";
import { seedKeys } from "./ordering";

import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";
import { bullets, doc, paragraph, tasks } from "./rich-text";

export interface OrganiserFixtures {
  boards: (typeof organiserBoards.$inferInsert)[];
  columns: (typeof organiserColumns.$inferInsert)[];
  cards: (typeof organiserCards.$inferInsert)[];
  tags: (typeof organiserTags.$inferInsert)[];
  cardTags: (typeof organiserCardTags.$inferInsert)[];
}

const TAGS = [
  { name: "Home", color: "var(--green-400)" },
  { name: "Kids", color: "var(--yellow-400)" },
  { name: "Admin", color: "var(--blue-400)" },
  { name: "Errands", color: "var(--taupe-400)" },
  { name: "Trip", color: "var(--purple-400)" },
];
type TagName = (typeof TAGS)[number]["name"];

interface CardSpec {
  title: string;
  tags?: TagName[];
  body?: string;
  color?: string;
  important?: boolean;
  /** Deadline in days from today (negative is overdue). */
  due?: number;
}

const COLUMNS: { name: string; color: string | null; isDone?: boolean; cards: CardSpec[] }[] = [
  {
    name: "To Do",
    color: null,
    cards: [
      {
        title: "Book summer trip to Japan",
        tags: ["Trip"],
        due: 12,
        body: doc(
          paragraph("Two weeks in July. Kyoto, then the Kumano Kodō."),
          tasks([
            ["Check flight prices", true],
            ["Ask about days off", false],
            ["Book ryokan in Kyoto", false],
          ])
        ),
      },
      { title: "Renew passport", tags: ["Admin"], important: true, due: 5 },
      { title: "Fix the bike's back brake", tags: ["Errands"], due: -2 },
      {
        title: "Plan Saga's birthday party",
        tags: ["Kids"],
        due: 20,
        color: "var(--yellow-400)",
        body: doc(bullets(["Invite list", "Cake: chocolate, obviously", "Treasure hunt"])),
      },
      { title: "Sort out the storage room", tags: ["Home"] },
    ],
  },
  {
    name: "In Progress",
    color: "var(--blue-400)",
    cards: [
      {
        title: "Declare taxes",
        tags: ["Admin"],
        important: true,
        due: 3,
        body: doc(
          tasks([
            ["Download the statement", true],
            ["Check travel deductions", true],
            ["Submit", false],
          ])
        ),
      },
      { title: "Paint the kids' room", tags: ["Home", "Kids"], due: 9 },
      { title: "Find a new dentist", tags: ["Errands"] },
    ],
  },
  {
    name: "Waiting",
    color: "var(--yellow-600)",
    cards: [
      {
        title: "Insurance refund for the phone",
        tags: ["Admin"],
        body: doc(paragraph("Sent the receipt on Monday. They said 10 working days.")),
      },
      { title: "Swimming school spot", tags: ["Kids"], due: 14 },
    ],
  },
  {
    name: "Done",
    color: "var(--green-600)",
    isDone: true,
    cards: [
      { title: "Winter tyres on", tags: ["Errands"], due: -10 },
      { title: "Parent-teacher meeting", tags: ["Kids"], due: -6 },
      { title: "Cancel the old gym", tags: ["Admin"] },
    ],
  },
];

export function buildOrganiserFixtures({
  userId,
  today,
}: {
  userId: string;
  today: IsoDate;
}): OrganiserFixtures {
  const id = (key: string) => stableUuid(userId, `organiser:${key}`);
  const createdAt = atHour(addDays(today, -30), 9);
  const boardId = id("board");
  const fixtures: OrganiserFixtures = {
    boards: [{ id: boardId, userId, createdAt, updatedAt: createdAt }],
    columns: [],
    cards: [],
    tags: TAGS.map((tag) => ({ id: id(`tag:${tag.name}`), userId, ...tag, createdAt })),
    cardTags: [],
  };

  const columnKeys = seedKeys(COLUMNS.length);
  COLUMNS.forEach((column, columnIndex) => {
    const columnId = id(`column:${column.name}`);
    fixtures.columns.push({
      id: columnId,
      boardId,
      userId,
      name: column.name,
      color: column.color,
      position: columnKeys[columnIndex] as string,
      collapsed: false,
      isDone: column.isDone ?? false,
      createdAt,
      updatedAt: createdAt,
    });

    const cardKeys = seedKeys(column.cards.length);
    column.cards.forEach((card, cardIndex) => {
      const cardId = id(`card:${card.title}`);
      fixtures.cards.push({
        id: cardId,
        columnId,
        boardId,
        userId,
        title: card.title,
        body: card.body ?? null,
        color: card.color ?? null,
        important: card.important ?? false,
        deadline: card.due === undefined ? null : addDays(today, card.due),
        position: cardKeys[cardIndex] as string,
        createdAt,
        updatedAt: createdAt,
      });
      for (const tag of card.tags ?? []) {
        fixtures.cardTags.push({ cardId, tagId: id(`tag:${tag}`) });
      }
    });
  });

  return fixtures;
}

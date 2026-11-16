import type { aiderConversations, aiderMessages } from "@jf/db";

import type { ClasserFixtures } from "./classer";
import { type IsoDate, addDays, atHour } from "./dates";
import { stableUuid } from "./determinism";
import type { FinancerFixtures } from "./financer";
import type { GainerFixtures } from "./gainer";
import type { RoutinerFixtures } from "./routiner";

export interface AiderFixtures {
  conversations: (typeof aiderConversations.$inferInsert)[];
  messages: (typeof aiderMessages.$inferInsert)[];
}

/** Aider's model options: the local "Fast" model and the "Capable" one. */
const FAST = "qwen2.5:3b-instruct";
const CAPABLE = "llama3.1:8b";

/** The other apps' demo data, so the data answers match what their screenshots show. */
export interface AiderSources {
  routiner: RoutinerFixtures;
  classer: ClasserFixtures;
  gainer: GainerFixtures;
  financer: FinancerFixtures;
}

type Turn =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tool?: { name: string; arguments: Record<string, unknown> };
    };

const number = (value: number) => Math.round(value).toLocaleString("en-GB");

function conversationsFrom(today: IsoDate, sources: AiderSources) {
  const month = today.slice(0, 7);

  const run = sources.routiner.habits.find((h) => h.name === "Morning run");
  const runs = sources.routiner.logs.filter(
    (log) => log.habitId === run?.id && log.date.startsWith(month)
  ).length;

  const hikesList = sources.classer.classers.find((c) => c.name === "Hikes");
  const hikes = sources.classer.items
    .filter((item) => item.classerId === hikesList?.id)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  const workouts = sources.gainer.sessions.filter(
    (s) => s.finishedAt && s.startedAt?.toISOString().startsWith(month)
  ).length;

  const assets = sources.financer.assetSources.map((source) => {
    const entry = sources.financer.assetEntries.find(
      (e) => e.sourceId === source.id && e.month === month
    );
    return `- **${source.name}**: ${number(Number(entry?.value ?? 0))} ${source.currency}`;
  });

  return [
    {
      key: "runs",
      title: "Morning runs this month",
      model: CAPABLE,
      daysAgo: 0,
      turns: [
        { role: "user", content: "How many times did I go for a morning run this month?" },
        {
          role: "assistant",
          content:
            runs >= 8
              ? `You logged **Morning run** ${runs} times this month. That's a solid streak, keep it going!`
              : `You logged **Morning run** ${runs} ${runs === 1 ? "time" : "times"} this month so far. The month's still young!`,
          tool: {
            name: "get_habit_log_count",
            arguments: { habit: "Morning run", period: "this_month" },
          },
        },
        { role: "user", content: "And how many workouts in Gainer?" },
        {
          role: "assistant",
          content: `You finished **${workouts} workouts** this month in Gainer.`,
          tool: { name: "get_workouts_in_range", arguments: { period: "this_month" } },
        },
      ] as Turn[],
    },
    {
      key: "hikes",
      title: "Best hikes",
      model: CAPABLE,
      daysAgo: 2,
      turns: [
        { role: "user", content: "What are my top 3 hikes?" },
        {
          role: "assistant",
          content: `From your **Hikes** list:\n\n${hikes.map((h, i) => `${i + 1}. **${h.name}**${h.description ? `: ${h.description}` : ""}`).join("\n")}`,
          tool: { name: "get_top_items_in_list", arguments: { list: "hikes", limit: 3 } },
        },
      ] as Turn[],
    },
    {
      key: "assets",
      title: "Where my savings are",
      model: CAPABLE,
      daysAgo: 5,
      turns: [
        { role: "user", content: "What are my assets right now?" },
        {
          role: "assistant",
          content: `Here's what you recorded for this month:\n\n${assets.join("\n")}`,
          tool: { name: "get_current_assets", arguments: {} },
        },
      ] as Turn[],
    },
    {
      key: "rainy-sunday",
      title: "Rainy Sunday with the kids",
      model: FAST,
      daysAgo: 9,
      turns: [
        { role: "user", content: "Ideas for a rainy Sunday with two kids, 4 and 7?" },
        {
          role: "assistant",
          content:
            "A few that work at both ages:\n\n- **Blanket fort cinema**: build it together, then a film with popcorn.\n- **Kitchen science**: baking soda volcanoes, or colour-changing red cabbage water.\n- **Treasure hunt**: hide clues around the flat, with the older one reading them to the younger.\n- **Puddle walk**: rain gear on, and count the snails.\n\nWant a simple recipe the two of them can cook?",
        },
        { role: "user", content: "Yes, something easy" },
        {
          role: "assistant",
          content:
            "**Pancakes** are hard to beat: flour, eggs, milk and a pinch of salt. The 7-year-old can measure and whisk, the 4-year-old can add the toppings. Cooking stays with you.",
        },
      ] as Turn[],
    },
    {
      key: "swedish",
      title: "Swedish phrase",
      model: FAST,
      daysAgo: 16,
      turns: [
        { role: "user", content: "How do I say 'see you next week' in Swedish?" },
        {
          role: "assistant",
          content: "**Vi ses nästa vecka!** Or, more casually, **Hörs nästa vecka!**",
        },
      ] as Turn[],
    },
  ];
}

export function buildAiderFixtures({
  userId,
  today,
  sources,
}: {
  userId: string;
  today: IsoDate;
  sources: AiderSources;
}): AiderFixtures {
  const fixtures: AiderFixtures = { conversations: [], messages: [] };
  for (const conversation of conversationsFrom(today, sources)) {
    const conversationId = stableUuid(userId, `aider:conversation:${conversation.key}`);
    // Today's chat happened this morning, so nothing lands after "now".
    const start = atHour(
      addDays(today, -conversation.daysAgo),
      conversation.daysAgo === 0 ? 6 : 20
    );
    const at = (turn: number) => new Date(start.getTime() + turn * 40_000);
    fixtures.conversations.push({
      id: conversationId,
      userId,
      title: conversation.title,
      model: conversation.model,
      createdAt: start,
      updatedAt: at(conversation.turns.length - 1),
    });
    conversation.turns.forEach((turn, index) => {
      fixtures.messages.push({
        id: stableUuid(userId, `aider:message:${conversation.key}:${index}`),
        conversationId,
        role: turn.role,
        content: turn.content,
        toolName: turn.role === "assistant" && turn.tool ? turn.tool.name : null,
        toolArguments:
          turn.role === "assistant" && turn.tool ? JSON.stringify(turn.tool.arguments) : null,
        createdAt: at(index),
      });
    });
  }
  return fixtures;
}

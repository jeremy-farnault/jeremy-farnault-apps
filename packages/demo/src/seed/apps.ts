import {
  aiderConversations,
  aiderMessages,
  classerItems,
  classers,
  doserDayOverrides,
  doserDoseLogs,
  doserMedicines,
  doserPillTypes,
  doserSymptomLogEntries,
  doserSymptomLogs,
  doserSymptoms,
  exposerItemTags,
  exposerItems,
  exposerPhotos,
  exposerTags,
  financerAssetEntries,
  financerAssetSources,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerSpendingCategories,
  financerSummaries,
  financerUserSettings,
  folders,
  gainerExercises,
  gainerSessionExercises,
  gainerSessions,
  gainerSets,
  journalerEntries,
  notes,
  organiserBoards,
  organiserCardTags,
  organiserCards,
  organiserColumns,
  organiserTags,
  placerCategories,
  placerSpots,
  pushSubscriptions,
  reminders,
  routinerHabits,
  routinerLogs,
  scannerItems,
  scannerLinks,
  scannerPriceChecks,
  unifierArcs,
  unifierPersons,
  unifierSlotValues,
  unifierSlots,
  unifierTouches,
} from "@jf/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { DemoApp, DemoFixtures } from "../fixtures";
import { uploadDemoImages } from "../images/upload";
import type { Tx } from "./types";

type Reset<A extends DemoApp> = (
  tx: Tx,
  userId: string,
  fixtures: DemoFixtures[A]
) => Promise<void>;

/** Inserts in batches, so long log histories stay under Postgres's parameter limit. */
async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += 500) {
    await insert(rows.slice(i, i + 500));
  }
}

/** Images first: the rows point at them. Already-uploaded keys are skipped. */
async function uploadAndLog(images: Parameters<typeof uploadDemoImages>[0]) {
  const uploaded = await uploadDemoImages(images);
  if (uploaded > 0) console.log(`    uploaded ${uploaded} demo image(s)`);
}

/**
 * Per app: delete every row the demo user owns, children first, then insert the fixtures.
 * Shared rows (no user id) are never touched.
 */
export const RESETS: { [A in DemoApp]: Reset<A> } = {
  aider: async (tx, userId, fixtures) => {
    // Messages go with their conversations (cascade).
    await tx.delete(aiderConversations).where(eq(aiderConversations.userId, userId));
    await tx.insert(aiderConversations).values(fixtures.conversations);
    await tx.insert(aiderMessages).values(fixtures.messages);
  },
  classer: async (tx, userId, fixtures) => {
    await uploadAndLog(fixtures.images);
    await tx.delete(classerItems).where(eq(classerItems.userId, userId));
    await tx.delete(classers).where(eq(classers.userId, userId));
    await tx.insert(classers).values(fixtures.classers);
    await insertInChunks(fixtures.items, (c) => tx.insert(classerItems).values(c));
  },
  doser: async (tx, userId, fixtures) => {
    // Pill types, overrides and dose logs go with their medicines, entries with their logs
    // (cascade). The demo user's custom symptoms go too; predefined ones are only read.
    await tx.delete(doserMedicines).where(eq(doserMedicines.userId, userId));
    await tx.delete(doserSymptomLogs).where(eq(doserSymptomLogs.userId, userId));
    await tx.delete(doserSymptoms).where(eq(doserSymptoms.userId, userId));

    const names = [...new Set(fixtures.symptomLogEntries.map((row) => row.symptomName))];
    const predefined = await tx
      .select({ id: doserSymptoms.id, name: doserSymptoms.name })
      .from(doserSymptoms)
      .where(and(isNull(doserSymptoms.userId), inArray(doserSymptoms.name, names)));
    const idByName = new Map(predefined.map((row) => [row.name, row.id]));
    const missing = names.filter((name) => !idByName.has(name));
    if (missing.length > 0) {
      throw new Error(
        `Doser's predefined symptoms are missing (${missing.join(", ")}). Run pnpm seed:doser.`
      );
    }

    await tx.insert(doserMedicines).values(fixtures.medicines);
    await tx.insert(doserPillTypes).values(fixtures.pillTypes);
    await tx.insert(doserDayOverrides).values(fixtures.dayOverrides);
    await insertInChunks(fixtures.doseLogs, (c) => tx.insert(doserDoseLogs).values(c));
    await insertInChunks(fixtures.symptomLogs, (c) => tx.insert(doserSymptomLogs).values(c));
    await insertInChunks(
      fixtures.symptomLogEntries.map(({ symptomName, ...row }) => ({
        ...row,
        symptomId: idByName.get(symptomName) as string,
      })),
      (c) => tx.insert(doserSymptomLogEntries).values(c)
    );
  },
  exposer: async (tx, userId, fixtures) => {
    await uploadAndLog(fixtures.photos.map((photo) => ({ key: photo.storageKey, art: photo.art })));

    // Photos and item tags go with their items (cascade).
    await tx.delete(exposerItems).where(eq(exposerItems.userId, userId));
    await tx.delete(exposerTags).where(eq(exposerTags.userId, userId));
    await tx.insert(exposerItems).values(fixtures.items);
    await tx.insert(exposerPhotos).values(fixtures.photos.map(({ art: _, ...photo }) => photo));
    await tx.insert(exposerTags).values(fixtures.tags);
    await tx.insert(exposerItemTags).values(fixtures.itemTags);
  },
  financer: async (tx, userId, fixtures) => {
    // Entries before their sources; every table filtered on the demo user.
    await tx.delete(financerAssetEntries).where(eq(financerAssetEntries.userId, userId));
    await tx.delete(financerIncomeEntries).where(eq(financerIncomeEntries.userId, userId));
    await tx.delete(financerAssetSources).where(eq(financerAssetSources.userId, userId));
    await tx.delete(financerIncomeSources).where(eq(financerIncomeSources.userId, userId));
    await tx.delete(financerEntries).where(eq(financerEntries.userId, userId));
    await tx.delete(financerSummaries).where(eq(financerSummaries.userId, userId));
    await tx
      .delete(financerSpendingCategories)
      .where(eq(financerSpendingCategories.userId, userId));
    await tx.delete(financerUserSettings).where(eq(financerUserSettings.userId, userId));

    await tx.insert(financerUserSettings).values(fixtures.settings);
    await tx.insert(financerSpendingCategories).values(fixtures.spendingCategories);
    await insertInChunks(fixtures.entries, (c) => tx.insert(financerEntries).values(c));
    await insertInChunks(fixtures.summaries, (c) => tx.insert(financerSummaries).values(c));
    await tx.insert(financerIncomeSources).values(fixtures.incomeSources);
    await tx.insert(financerAssetSources).values(fixtures.assetSources);
    await insertInChunks(fixtures.incomeEntries, (c) => tx.insert(financerIncomeEntries).values(c));
    await insertInChunks(fixtures.assetEntries, (c) => tx.insert(financerAssetEntries).values(c));
  },
  gainer: async (tx, userId, fixtures) => {
    // Session exercises and sets go with their sessions (cascade); custom exercises are the
    // demo user's own. Predefined exercises (no user id) are only read.
    await tx.delete(gainerSessions).where(eq(gainerSessions.userId, userId));
    await tx.delete(gainerExercises).where(eq(gainerExercises.userId, userId));

    const names = [...new Set(fixtures.sessionExercises.map((row) => row.exerciseName))];
    const predefined = await tx
      .select({ id: gainerExercises.id, name: gainerExercises.name })
      .from(gainerExercises)
      .where(and(isNull(gainerExercises.userId), inArray(gainerExercises.name, names)));
    const idByName = new Map(predefined.map((row) => [row.name, row.id]));
    const missing = names.filter((name) => !idByName.has(name));
    if (missing.length > 0) {
      throw new Error(
        `Gainer's predefined exercises are missing (${missing.join(", ")}). Run pnpm seed:gainer.`
      );
    }

    await insertInChunks(fixtures.sessions, (c) => tx.insert(gainerSessions).values(c));
    await insertInChunks(
      fixtures.sessionExercises.map(({ exerciseName, ...row }) => ({
        ...row,
        exerciseId: idByName.get(exerciseName) as string,
      })),
      (c) => tx.insert(gainerSessionExercises).values(c)
    );
    await insertInChunks(fixtures.sets, (c) => tx.insert(gainerSets).values(c));
  },
  journaler: async (tx, userId, fixtures) => {
    await uploadAndLog(fixtures.images);
    await tx.delete(journalerEntries).where(eq(journalerEntries.userId, userId));
    await insertInChunks(fixtures.entries, (c) => tx.insert(journalerEntries).values(c));
  },
  noter: async (tx, userId, fixtures) => {
    // Reminders and push subscriptions too, in case someone clicked around as the demo user:
    // the fixtures have none, so the reminder cron never has anything to send.
    await tx.delete(reminders).where(eq(reminders.userId, userId));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await tx.delete(notes).where(eq(notes.userId, userId));
    await tx.delete(folders).where(eq(folders.userId, userId));
    // Parents before children: folders are listed top-level first.
    await tx.insert(folders).values(fixtures.folders);
    await tx.insert(notes).values(fixtures.notes);
  },
  organiser: async (tx, userId, fixtures) => {
    // Columns, cards and card tags go with the board and tags (cascade).
    await tx.delete(organiserBoards).where(eq(organiserBoards.userId, userId));
    await tx.delete(organiserTags).where(eq(organiserTags.userId, userId));
    await tx.insert(organiserBoards).values(fixtures.boards);
    await tx.insert(organiserTags).values(fixtures.tags);
    await tx.insert(organiserColumns).values(fixtures.columns);
    await tx.insert(organiserCards).values(fixtures.cards);
    await tx.insert(organiserCardTags).values(fixtures.cardTags);
  },
  placer: async (tx, userId, fixtures) => {
    await tx.delete(placerSpots).where(eq(placerSpots.userId, userId));
    await tx.delete(placerCategories).where(eq(placerCategories.userId, userId));
    await tx.insert(placerCategories).values(fixtures.categories);
    await tx.insert(placerSpots).values(fixtures.spots);
  },
  routiner: async (tx, userId, { habits, logs }) => {
    await tx.delete(routinerLogs).where(eq(routinerLogs.userId, userId));
    await tx.delete(routinerHabits).where(eq(routinerHabits.userId, userId));
    await insertInChunks(habits, (chunk) => tx.insert(routinerHabits).values(chunk));
    await insertInChunks(logs, (chunk) => tx.insert(routinerLogs).values(chunk));
  },
  scanner: async (tx, userId, fixtures) => {
    // Links and price checks go with their items (cascade).
    await tx.delete(scannerItems).where(eq(scannerItems.userId, userId));

    // Stamp each wishlist link's latest check with the seeding time: Scanner rechecks links
    // older than an hour when the wishlist opens, so a capture right after seeding stays
    // offline. Bought items keep their old dates.
    const now = new Date();
    const bought = new Set(fixtures.items.filter((i) => i.status === "bought").map((i) => i.id));
    const fresh = new Set(fixtures.links.filter((l) => !bought.has(l.itemId)).map((l) => l.id));
    const links = fixtures.links.map((link) =>
      fresh.has(link.id ?? "") ? { ...link, lastCheckedAt: now, lastSuccessAt: now } : link
    );
    const newest = new Map<string, number>();
    for (const check of fixtures.checks) {
      const time = check.checkedAt?.getTime() ?? 0;
      if (time > (newest.get(check.linkId) ?? -1)) newest.set(check.linkId, time);
    }
    const checks = fixtures.checks.map((check) =>
      fresh.has(check.linkId) && check.checkedAt?.getTime() === newest.get(check.linkId)
        ? { ...check, checkedAt: now }
        : check
    );

    await tx.insert(scannerItems).values(fixtures.items);
    await tx.insert(scannerLinks).values(links);
    await insertInChunks(checks, (c) => tx.insert(scannerPriceChecks).values(c));
  },
  unifier: async (tx, userId, fixtures) => {
    // Slots, persons, values and touches go with their arcs (cascade).
    await tx.delete(unifierArcs).where(eq(unifierArcs.userId, userId));
    await tx.insert(unifierArcs).values(fixtures.arcs);
    await tx.insert(unifierSlots).values(fixtures.slots);
    await tx.insert(unifierPersons).values(fixtures.persons);
    await tx.insert(unifierSlotValues).values(fixtures.slotValues);
    await tx.insert(unifierTouches).values(fixtures.touches);
  },
};

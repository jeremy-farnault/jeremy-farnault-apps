import { checkLink } from "@/lib/check-link";
import { createCheckQueue, storeKey } from "@/lib/check-queue";
import { buildDigest, isSendHour } from "@/lib/digest";
import { getDigestRecipients, getWishlist } from "@/lib/queries";
import { summarizeItem } from "@/lib/summary";
import { sendEmail } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { getExchangeRates } from "@jf/db";
import { NextResponse } from "next/server";

export const maxDuration = 300;

// Checks stop starting this long into the run, leaving the last minute of the 300 s limit
// for checks already running, and for building and sending the emails.
const CHECK_BUDGET_MS = 240_000;

// The morning run, called by the Scanner cron workflow at 05:00 and 06:00 UTC: checks every
// wishlist link, then emails each user their items on sale. Only the run that lands at 7:xx
// in Stockholm does anything; `force=1` (manual runs) skips that.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isSendHour(new Date())) {
    return NextResponse.json({ skipped: "not 7:00 in Stockholm" });
  }

  const deadline = Date.now() + CHECK_BUDGET_MS;
  // Item links in the email point back at whichever deployment the workflow called.
  const appUrl = new URL(request.url).origin;
  const [recipients, rates] = await Promise.all([getDigestRecipients(), getExchangeRates()]);
  let sent = 0;
  let failed = 0;
  // One user's error is logged and doesn't stop the others; any error fails the response,
  // so the workflow run fails and GitHub says so.
  for (const { userId, email } of recipients) {
    try {
      const unchecked = await checkAll(userId, deadline);
      const [items, settings] = await Promise.all([getWishlist(userId), getUserSettings(userId)]);
      const digest = buildDigest(
        items.map((item) => summarizeItem(item, rates, settings.homeCurrency)),
        { homeCurrency: settings.homeCurrency, appUrl, now: new Date(), unchecked }
      );
      if (!digest) continue;
      await sendEmail({ to: email, ...digest });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`Scanner daily check failed for user ${userId}`, error);
    }
  }
  return NextResponse.json(
    { users: recipients.length, sent, failed },
    { status: failed > 0 ? 500 : 200 }
  );
}

/**
 * Checks every wishlist link of one user, spread out the way the main list spreads them,
 * until the deadline. Returns the links it didn't get to.
 */
async function checkAll(userId: string, deadline: number): Promise<string[]> {
  const links = (await getWishlist(userId)).flatMap((item) => item.links);
  const queue = createCheckQueue({
    check: (linkId) => checkLink(userId, linkId),
    onResult: () => {},
    deadline,
  });
  queue.add(links.map((l) => ({ linkId: l.id, store: storeKey(l.url) })));
  return queue.whenIdle();
}

import { db } from "@jf/db";
import { badgeStatus } from "@jf/furyo-logic";
import { NextResponse } from "next/server";

import { isAppOrigin } from "@/lib/cors";
import { preflight, withSession } from "@/lib/route";
import { loadSave } from "@/lib/saves";

// The furyo badge's status (ticket 15), polled by every monorepo app with the shared session
// cookie. Catches the stored furyo up to now with the game logic, without saving him, and
// returns only what the badge needs:
//   { status: "none" }                                     no furyo yet: the badge opens a new game
//   { status: "furyo", name, needsYou, over }              needsYou: a vital under 25%, or game over
//   { status: "unknown" }                                  a save newer than packages/furyo-logic
export const GET = withSession(isAppOrigin, async (_request, userId) => {
  const saved = await loadSave(db, userId);
  const status = saved ? badgeStatus(saved.state, Date.now()) : ({ status: "none" } as const);
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
});

export const OPTIONS = preflight(isAppOrigin, "GET, OPTIONS");

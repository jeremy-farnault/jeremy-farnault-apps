// Furyodachi's game logic, for the save API's status route (the furyo badge, ticket 15).
//
// src/vendor/ is a copy of the game repo's src/logic and src/balance, pinned to the commit in
// vendor.json. Never edit it here: change the game, then run `node scripts/export-logic.mjs`
// from the furyodachi repo. A save from a newer game (a STATE_VERSION above vendor.json's)
// reads as { status: "unknown" } until the copy is refreshed.
export { badgeStatus, STATE_VERSION } from "./vendor/logic";
export type { BadgeStatus } from "./vendor/logic";

# @jf/furyo-logic

A copy of [Furyodachi](https://furyodachi.jeremyfarnault.com)'s game logic (`src/logic`, `src/balance` in the private `furyodachi` repo), pinned to the commit in `vendor.json`. The save API's status route (`apps/furyo-api`, the furyo badge) uses it to catch the stored furyo up to now.

**Don't edit `src/vendor/`.** Change the game, then from the furyodachi repo: `node scripts/export-logic.mjs ../jeremy-farnault-apps`.

Why a copy and not a package: the game repo is private, so installing it would need a token in every Vercel project's install.

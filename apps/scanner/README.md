# @jf/scanner

Wishlist price tracker: paste product links (PS Store per region, Steam, any shop that
publishes schema.org product data) and see where each item is cheapest right now, converted
to your home currency. Spec and tickets: `documentation/personal/01_Projects/Monorepo/Apps/Scanner/`.

## Live store check

The price reader's tests run against saved pages, so they can't tell when a store changes
its page. The live check reads real pages instead:

```bash
pnpm --filter @jf/scanner live-check                       # one page per store
LIVE_URL='<link>' pnpm --filter @jf/scanner live-check     # just that link
LIVE_URL='<steam link>' LIVE_REGION=JP pnpm --filter @jf/scanner live-check
```

Run it when a store seems broken (links showing "check failed"), or before relying on a new
shop. It exits non-zero when a store can't be read. It is never part of CI.

# Bond6 Transmissions

An English-language reading feed on writing, creative work, and life with AI. The original display site is preserved in Git history.

## Local preview

Use Node.js 22 or later.

```sh
npm ci
npx wrangler d1 migrations apply DB --local
npm run dev -- --local --var TRANSLATE_HEADLINES:false
```

Open the URL printed by Wrangler. To populate the feed, call `/__scheduled` at that URL. Each call polls one due source. Allow each poll to finish before calling again to cycle through the source list. The local schedule endpoint is provided by Wrangler in development.

## Cloudflare deployment

1. Authenticate Wrangler to the Cloudflare account that manages bond6.io.
2. Create a D1 database with `npx wrangler d1 create bond6-transmissions`. Set `database_id` in `wrangler.jsonc` to the returned ID.
3. Run `npx wrangler d1 migrations apply DB --remote`, then `npm run deploy`.
4. Review the `workers.dev` URL, verify scheduled runs and CPU usage in the Worker logs, and check that all enabled sources are collecting as expected.
5. In Cloudflare Workers Builds, connect the GitHub repository and select the production branch. Use `npx wrangler deploy` as the deploy command. Apply future D1 migrations before shipping code that depends on them.
6. When ready to switch production, identify the existing bond6.io domain binding in Cloudflare, detach it from the display site, and attach bond6.io to the Worker under Domains & Routes. Retain the display project for rollback.

## Operations

English is served at `/` and Simplified Chinese at `/zh/`. Each edition has its own RSS URL. Cloudflare Workers AI uses the `AI` binding to translate up to three pending headlines per scheduled run. The Chinese edition shows the original title while a translation is pending. Set `TRANSLATE_HEADLINES` to `false` to pause inference or to run a local preview without Cloudflare credentials.

Edit `src/sources.js` to change the tracked publications and Bluesky accounts. The Cron Trigger polls one due source per minute. A successful source is due again after at least ten minutes, with a longer interval as the list grows. Failed sources retry with backoff and log a warning.

Latest displays 20 stories per page. The collector trims stories after seven days or when they fall outside the newest `MAX_STORIES` entries, whichever comes first. Change `MAX_STORIES` from 1000 to 2000 for a 100-page ceiling. Trending counts distinct tracked sources that mentioned the same link in the past 24 hours.

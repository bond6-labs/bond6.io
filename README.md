# The Bond6 Flow

A bilingual daily reading site about culture, creative work and life with AI. Cloudflare Worker + D1, server-rendered HTML, progressively enhanced with browser-local saves. The original display site and the earlier clean design remain in Git history; `1acf1bb` preserves the pre-daily-edition work.

## Development

Use Node 22.13 or newer.

```sh
npm ci
npx wrangler d1 migrations apply DB --local
npm test
npm run dev -- --local --port 8796 --var TRANSLATE_HEADLINES:false --var GENERATED_PUBLISHING:false --var RHYTHM_SHADOW_MODE:false
```

On a restricted Windows workspace, direct development-only Wrangler files into the checkout:

```powershell
$env:WRANGLER_LOG_PATH = Join-Path (Get-Location) '.wrangler\logs'
$env:CLOUDFLARE_DEV_REGISTRY_PATH = Join-Path (Get-Location) '.wrangler\registry'
```

`node scripts/preview-data.mjs` collects real public feeds into the **local** database. `node scripts/audit-ai.mjs 30` uses the authenticated, remote Workers AI binding, with a local usage ledger and a resumable ignored `.local/ai-audit-passages.json` report. It spends real account AI allowance; do not run independent audit ledgers alongside production inference. `node scripts/preview-edition.mjs` previews successfully checked notes locally. These scripts never publish their preview editions to production.

## Routes

English `/`, Chinese `/zh/`; both have `/edit`, `/edit/YYYY-MM-DD`, `/bond`, `/bond/<slug>`, `/saved`, `/about`, `/sources`, `/subscribe`, `/trending`, and `/feed.xml`. Query parameters `lane=human|ai` and `topic=music|art|writing|practice|digital` preserve reading choices. `q` searches retained headlines, translations, authors and publications. `view=all&page=2` explicitly paginates arrivals.

RSS accepts `kind=live|daily|bond` and optional `lane=human|ai`. The original unfiltered feed URLs remain valid. Dated editions have language alternates, canonical addresses, social metadata and sitemap entries. Expired edition URLs return 404 rather than silently pointing to another edition.

## Collection and publishing

- A cron runs every minute. Collection and publication use separate invocations. Each source has a durable leased job, conditional HTTP requests and failure backoff. Collection is normally once per source about every 25–50 minutes, depending on publishing work and failures.
- Items preserve author, original language, publication date (nullable), first discovery, source ID, type, excerpt, destination and content hash. Shared articles never inherit a social posting date. Distinctive social posts keep their own permalink and byline; reposts/replies are not featured. Known shorteners have a bounded redirect resolver.
- Source excerpts are untrusted data. AI receives no tools. Topic assignment requires item content, and daily selection further checks the assigned lane. Human Voices is not a claim of certified AI-free authorship.
- At 12:00 UTC, preparation considers the previous 72 hours, extending to seven days. One publisher/author per edition, no repeat selection within seven days, subject variety, and qualifying Chinese originals are preferred. Each lane holds at most three picks.
- While `GENERATED_PUBLISHING=false`, `RHYTHM_SHADOW_MODE=true` writes one no-AI, no-publishing selection audit each day between 12:00 and 14:00 UTC. This gives the team a real candidate-pool sample before enabling daily editions.
- One job step prepares a bilingual note, another compares it with its source. Numbered supporting passages are resolved by the server; unknown references, unsupported numbers, invalid language and other deterministic failures are rejected. The independent comparison also checks meaning, names, dates and attribution. Only finalized validated snapshots are published in a transaction with lease fencing.
- Daily preparation retries through 14:00 UTC. Fewer qualified picks can publish; an empty or failed preparation preserves the previous dated edition. The Bond creates at most one interpretation daily from the validated stories, with a separate review and a specific question. Older researched Bond editions have stable, explicitly dated field-note URLs.
- Model: `@cf/qwen/qwen3.8-27b`, structured JSON, low reasoning setting with the documented non-thinking template switch. Testing showed the reasoning output otherwise exhausted the small completion cap before producing JSON. Every request reserves estimated neurons before inference and reconciles reported token usage afterward. Unknown/failed usage remains charged. The hard configured ceiling is 8,000 neurons per UTC day; it includes translation. No inference happens while serving pages.
- Picks take priority, followed by The Bond, followed by rolling headline translation after 15:00 UTC. Budget/model failures leave originals readable. Old translations are invalidated when titles change; note caching uses the whole source-content hash.

## Retention and privacy

At most 1,000 live records, with seven days for AI and thirty for culture, measured from discovery. Keep 50 daily and 50 generated Bond snapshots with compact attribution. Job/evidence detail expires after eight days, AI totals after 35 days, aggregate event totals after 60 days. The four original researched Bond editions remain code-backed archive material.

Saves (maximum 100) and visit markers stay in browser storage; saves have remove, clear and undo controls. Storage/JavaScript failure does not block reading. Aggregate events contain only a date, event type and count—no server visitor ID, URL or search query. Respect DNT/GPC. Counts are directional browser proxies, not unique-person or cross-device retention measurements. Cloudflare operational logs are separate.

## Release and operations

Push `codex/transmissions` to run **Deploy Bond6 to Cloudflare**. CI installs dependencies, runs tests/syntax checks, applies additive D1 migrations, then deploys. The token needs Workers deployment and D1 edit permissions. Migrations preserve compatibility with the preceding worker; never reset the production DB.

`GENERATED_PUBLISHING=false` pauses daily/Bond creation independently of collection. `RHYTHM_SHADOW_MODE=true` keeps the no-AI selection audit running while publishing is paused; set it to `false` to pause that audit too. `TRANSLATE_HEADLINES=false` pauses rolling inference. Disabling publication does not delete editions. Change `wrangler.jsonc` and deploy to persist switches; the next GitHub deployment restores repository configuration.

Before enabling publishing, review at least 30 bilingual source/output cases, inspect accepted and rejected results, and verify the account allowance. Real-world model checks supplement mocked failure/concurrency tests. Do not represent a passing test suite as a factual-accuracy guarantee.

Run `node scripts/ops-report.mjs` for a read-only production report using your Wrangler login. It includes source failures, job errors, daily edition size, Rhythm shadow audits, AI accounting, source diversity and engagement totals. Review at least seven shadow audits for balanced candidates, clear shortfalls and source freshness before enabling publication. During the first seven publishing days, check each daily edition after 14:00 UTC, source freshness and Cloudflare CPU/errors. Establish a 14-day baseline, then compare the following 14 days: returning-browser/visit ratio, original opens/saves/shares per visit, successful editions, sources/languages represented and corrections. Seven-day observation and four-week impact results require actual elapsed operation.

If publishing fails, inspect the leased job's `last_error`, source failures, and daily AI allowance. A lease expires after five minutes, making interrupted work retryable. Reverting the worker to the previous Git revision is possible without reversing additive migrations. Public pages and RSS cache for 60 seconds, so allow a minute when verifying a deployment.

No email provider, advertising system, paid plan upgrade, Reddit API scraping or third-party tracking is introduced. RSS is the subscription mechanism. Reddit automation requires approved access. Images from sources remain opt-in pending suitable reuse terms; the only new image is the site's own social preview card.

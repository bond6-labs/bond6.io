# Bond6 Source Vitality

**Status:** implemented; automatic technical protection and evidence-based trial promotion

**Depends on:** Bond6 Rhythm, durable source state, D1 row-usage safeguards

**Last reviewed:** 2026-11-18

**Related:** [Source Discovery](SOURCE_DISCOVERY.md) — coverage roles, candidate intake, and first-discovery lead-time evidence

## Purpose

Bond6 should maintain a living reading catalogue, not a static list of feeds. **Source Vitality** is the operating system for that catalogue. It evaluates whether each source is:

- technically reachable;
- still publishing at a useful cadence;
- producing complete, original-language items;
- contributing stories that actually fit Human Pulse or AI Wave;
- distinct rather than duplicative;
- worth its limited polling capacity.

It rewards editorial fit and useful specificity, not publisher size, political viewpoint, sensationalism, or raw volume.

## Catalogue limits

| State | English | Simplified Chinese | Meaning |
| --- | ---: | ---: | --- |
| Active | up to 50 | up to 25 | May contribute to the public Flow. |
| Candidate | up to 20 | up to 20 | Trial feeds; not eligible for public display until promoted. |
| Watch | included in active cap | included in active cap | Still collected, but under review for weak value or declining health. |
| Paused / retired | no limit | no limit | Kept as a compact record with a reason and date. |

Language ceilings protect the Chinese and English editions from crowding each other out. Lane and subject diversity are separate checks: a catalogue full of AI-industry reporting or gaming feeds is not healthy merely because it fits a language cap.

## Lifecycle

```text
Candidate → probation → active → watch → paused / retired
                 ↑          │       │
                 └──────────┘       └── recovery after fresh evidence
```

### Candidate

A candidate has a verified public feed URL, declared language, intended lane/subjects, and a reason it could add something not already covered. It is polled slowly and stored for evaluation, but does not populate the live site.

### Probation

A candidate enters probation after its feed is readable. It must gather enough observations before any editorial judgement; a ten-item sample is a signal, not a verdict.

### Active

An active source has earned a place through editorial fit, usable yield, reliability, and distinctiveness. It may be assigned a rapid, standard, or slow polling tier.

### Watch

The source is technically reachable but has declining editorial yield, excessive duplication, or a mismatch with its declared role. It remains available while more evidence is collected at a reduced cadence.

### Paused and retired

Broken feeds are paused automatically after three failed observation days, so a
bad endpoint cannot repeatedly spend the free polling budget. Editorial
retirement remains a reviewed recommendation. A retired record retains the
reason, score snapshot, and a cooldown date so the same weak feed is not
repeatedly re-added.

A source that still responds but produces no genuinely new item for **60 days**
automatically moves from `active` to `watch`, with a 24-hour collection cadence.
It is not deleted or automatically retired: this distinguishes a quiet publisher
from a broken source and gives an editor a clear, reversible cleanup queue.

**Archival guarantee:** Bond6 does not delete a source because it becomes stale,
low-yield, or temporarily inaccessible. A source first moves to `watch` or
`paused`; only a documented technical failure or reviewed editorial decision can
move it to `retired`. Retirement keeps the feed URL, publisher, language,
reason, state-change date, evaluation evidence and historical story attribution.
An editor can restore the same record to `candidate`, `probation`, `watch`, or
`active` without rediscovering or recreating it.

## Observations

Each polling attempt contributes to a compact daily aggregate for its source:

```text
checks, successful checks, errors, last successful response
raw feed items, usable items, lane-accepted items, duplicate items
rejection reasons, new accepted items, last genuinely new item
language, lane, source tier, expected cadence
```

The source algorithm must use original feed items, not generated translations or summaries. Reader behaviour may later be included only as anonymous daily aggregates of source opens/saves; it must not store visitor identities, reading histories, or search text.

## Scores

Source Vitality has two distinct scores. Keeping them separate prevents a frequently publishing but poor-fit feed from looking healthy.

### 1. Vitality score — is the source alive and dependable?

| Component | Weight | What it measures |
| --- | ---: | --- |
| Technical reliability | 40% | successful checks, errors, redirects, malformed responses |
| Freshness against expected cadence | 35% | time since a genuinely new usable item, adjusted for the source's normal rhythm |
| Feed completeness | 15% | usable titles, excerpts, URLs, dates, and language |
| Stable operation | 10% | no recurring duplicate or parsing failure pattern |

### 2. Value score — is the source valuable to Bond6?

| Component | Weight | What it measures |
| --- | ---: | --- |
| Editorial fit | 35% | share that passes the Human Pulse or AI Wave gates |
| Usable-quality yield | 25% | items with enough source information and substantive excerpts |
| Originality | 15% | unique stories rather than repeated shared links or duplicate coverage |
| Fresh relevance | 15% | timely accepted items relative to its declared tier |
| Reader signal, capped | 10% | anonymous aggregate source opens/saves, never raw clicks alone |

Source Discovery adds a small, bounded timeliness contribution to value when a
source supplies a trustworthy original publication time. It measures the delay
between publication and Bond6’s first observation after the source baseline;
it cannot outweigh editorial fit or usable yield. See
[Source Discovery](SOURCE_DISCOVERY.md) for the full coverage-gap process.

```text
Source standing =
  0.45 × vitality score
  + 0.55 × value score
```

The slight preference for Value makes Bond6 editorially selective: a perfectly working feed that rarely contributes relevant reading should not keep a scarce active slot.

## Evidence thresholds and actions

Ratios are smoothed with a small prior so three strong items out of ten are promising, but not treated as certainty. No editorial action is based on a tiny sample.

| Evidence | Recommended action |
| --- | --- |
| 14 days, 20+ usable items, standing ≥65 | Automatically promote probation source to active at a slow cadence. |
| 14 days, fewer than 20 usable items | Continue probation; do not punish a genuinely slow source. |
| 40+ raw items and very low accepted yield | Move to watch; reduce cadence. |
| 100+ raw items and fewer than 2–3 accepted items | Recommend editorial retirement. |
| Duplicate share above 60% over a meaningful sample | Reduce cadence, merge role with a better source, or retire. |
| Failed checks on 3 observed days | Pause automatically; preserve the feed and reason for repair/reactivation. |
| No successful response for 30 days | Retire automatically with a technical reason. |
| Successful responses but no genuinely new item for 60 days | Move to watch and collect once per day; review before retiring. |
| Low-volume source with a high value score | Preserve as a pinned slow source. |

“Expected cadence” is source-specific. A quarterly literary journal must never be removed simply for not producing daily news.

## Polling budget

Bond6 currently permits at most 576 source collections per UTC day:

```text
288 five-minute scheduler ticks × 2 collections per tick
```

The active catalogue must fit that budget with margin for retries. The current
operating configuration supports a 66-source live catalogue and a deliberately
broad 40-source trial pool. Candidate feeds are checked only once per day and
are never reader-visible, so this lets Bond6 learn from promising sources
without treating a research list as public editorial endorsement.

| Tier | Typical use | Count | Interval | Polls/day |
| --- | --- | ---: | ---: | ---: |
| Rapid | a few high-signal AI / technology sources | 6 | 45 minutes | 192 |
| Standard | dependable news and culture publishers | 20 | 4 hours | 120 |
| Slow | essays, art, literature, research, podcasts | 40 | 8 hours | 120 |
| Candidate | trial sources | 40 | 24 hours | 40 |
| **Planned total** |  | **106** |  | **472** |

This leaves 104 collections/day for retries, one-off verification, and temporary escalation. The implementation supports source intervals up to 24 hours and uses an indexed “sources due now” query instead of loading every source state at every scheduler tick.

### Initial catalogue cadence

The existing sources are seeded without discarding any previous record. Nine
high-yield editorial sources (six AI and three Human Pulse) use a 45-minute
cadence; the rest use standard, slow, or trial intervals. Human rapid sources
are deliberately limited to Hyperallergic, Literary Hub, and Creative Boom:
they improve freshness without letting a cultural feed overwhelm the budget.
Poetry and first-party cultural-audio feeds may use a smaller excerpt threshold
only after they pass the same item-level Human Pulse gate.

## Operator controls

The catalogue is data-driven at runtime. The current `src/sources.js` list is seeded once into `source_catalogue`; it remains the auditable record of Bond6's initial sources, while day-to-day state, cadence, and candidate entries live in D1. Re-running a deploy synchronizes harmless metadata (name, feed URL, declared language and role) but deliberately never overwrites a source's operational state, reason, pinned setting, or accumulated evidence.

To trial a proposed source, add a row as `candidate` with a verified public feed URL, declared language and intended lane. Its first successful check automatically moves it to `probation`; it is observed but cannot appear in the public Flow. After at least 14 days, 20 usable items, and a standing of 65, a probation source is promoted to active at its declared `promotion_tier` (slow by default). An editor can still record a documented `watch`, `paused`, or `retired` outcome at any time.

This separation means Bond6 can add, test, slow, pause, restore, or retire individual sources without a code deploy, while preserving the original source list and every decision's reason in the database.

## Required data model

The implementation should add, without deleting current records:

```text
source_catalogue
  id, name, feed_url, site_url, language, intended_lane, subjects
  state, tier, expected_minutes, pinned, added_at, review_after
  last_state_change, state_reason

source_daily_observations
  source_id, day, checks, successes, errors
  raw_items, usable_items, accepted_items, duplicate_items
  rejection_summary, last_new_item_at

source_evaluations
  source_id, evaluated_at, sample_start, sample_end
  vitality_score, value_score, standing, recommendation, rationale
```

Daily aggregates—not a record per reader or per rendering request—keep the system affordable and privacy-respecting.

## Evaluation job

Run once per UTC day after collection and before pruning:

1. Load active, watch, candidate, probation, and paused sources with their rolling 14-, 30-, and 90-day aggregates.
2. Calculate scores and confidence based on sample size.
3. Apply automatic technical pauses and high-confidence probation promotions.
4. Produce demotion, retirement, and cadence recommendations.
5. Enforce English/Chinese caps, source diversity, and pinned-source protection.
6. Store a compact rationale and send it to an internal diagnostic report.
7. Require review before editorial promotions or retirements during calibration.

Every state change remains reversible and attributable. Run `npm run report:sources`
after a Wrangler login for the source-by-source diagnostic: fetches, successes,
usable and accepted items, current Flow-eligible cards, last success/new content,
scores, and the recorded reason. “Current Flow-eligible” is intentionally not a
reader-impression count; Bond6 does not retain individual reader histories.

## Success criteria

After an initial four-week calibration period, Source Vitality should demonstrate:

- a healthy mix of English and Chinese sources within their caps;
- fewer duplicate cards and off-scope items reaching the public Flow;
- enough fresh qualified material without turning the site into a high-volume news dump;
- clear reasons for every inactive, paused, promoted, or retired source;
- source polling and D1 usage remaining below the free-tier operating budget.

## Non-goals

Source Vitality does not determine truth, political neutrality, artistic merit, or global popularity. It does not scrape private content, bypass publisher controls, or replace correction and attribution practices. It is a transparent way to allocate Bond6's limited attention and collection capacity.

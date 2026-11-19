# Bond6 Source Vitality

**Status:** approved design; implementation pending

**Depends on:** Bond6 Rhythm, durable source state, D1 row-usage safeguards

**Last reviewed:** 2026-11-18

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
| Candidate | up to 10 | up to 5 | Trial feeds; not eligible for public display until promoted. |
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

Broken feeds can be paused automatically. Editorial retirement should initially be a reviewed recommendation. A retired record retains the reason, score snapshot, and a cooldown date so the same weak feed is not repeatedly re-added.

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
| 14 days, 20+ usable items, strong standing, available language slot | Promote candidate to active. |
| 14 days, fewer than 20 usable items | Continue probation; do not punish a genuinely slow source. |
| 40+ raw items and very low accepted yield | Move to watch; reduce cadence. |
| 100+ raw items and fewer than 2–3 accepted items | Recommend editorial retirement. |
| Duplicate share above 60% over a meaningful sample | Reduce cadence, merge role with a better source, or retire. |
| Repeated failed checks for 14 days | Pause automatically. |
| No successful response for 30 days | Retire automatically with a technical reason. |
| Low-volume source with a high value score | Preserve as a pinned slow source. |

“Expected cadence” is source-specific. A quarterly literary journal must never be removed simply for not producing daily news.

## Polling budget

Bond6 currently permits at most 576 source collections per UTC day:

```text
288 five-minute scheduler ticks × 2 collections per tick
```

The active catalogue must fit that budget with margin for retries. A target configuration for 75 active sources plus 15 candidates is:

| Tier | Typical use | Count | Interval | Polls/day |
| --- | --- | ---: | ---: | ---: |
| Rapid | a few high-signal AI / technology sources | 6 | 45 minutes | 192 |
| Standard | dependable news and culture publishers | 20 | 4 hours | 120 |
| Slow | essays, art, literature, research, podcasts | 49 | 8 hours | 147 |
| Candidate | trial sources | 15 | 24 hours | 15 |
| **Planned total** |  | **90** |  | **474** |

This leaves 102 collections/day for retries, one-off verification, and temporary escalation. It requires lifting the present three-hour maximum source interval and using an indexed “sources due now” query instead of loading every source state at every scheduler tick.

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

1. Load active, watch, candidate, and paused sources with their rolling 14-, 30-, and 90-day aggregates.
2. Calculate scores and confidence based on sample size.
3. Apply automatic technical pauses only.
4. Produce promotion, demotion, retirement, and cadence recommendations.
5. Enforce English/Chinese caps, source diversity, and pinned-source protection.
6. Store a compact rationale and send it to an internal diagnostic report.
7. Require review before editorial promotions or retirements during calibration.

After at least four weeks of reliable observation, explicitly approved high-confidence rules may be automated. Every state change must remain reversible and attributable.

## Success criteria

After an initial four-week calibration period, Source Vitality should demonstrate:

- a healthy mix of English and Chinese sources within their caps;
- fewer duplicate cards and off-scope items reaching the public Flow;
- enough fresh qualified material without turning the site into a high-volume news dump;
- clear reasons for every inactive, paused, promoted, or retired source;
- source polling and D1 usage remaining below the free-tier operating budget.

## Non-goals

Source Vitality does not determine truth, political neutrality, artistic merit, or global popularity. It does not scrape private content, bypass publisher controls, or replace correction and attribution practices. It is a transparent way to allocate Bond6's limited attention and collection capacity.

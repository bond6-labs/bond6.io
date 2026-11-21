# Bond6 Source Discovery

**Status:** implemented as a bounded, evidence-first extension of Source Vitality

## Why this exists

Source Vitality answers: *is a known feed worth keeping?* It cannot answer:
*which kind of trustworthy source is Bond6 missing?* That gap matters when a
major event appears in a high-quality publication outside the existing list.

Source Discovery makes the catalogue deliberately diverse without turning it
into a web crawler, a popularity contest, or an unlimited list of feeds.

## Coverage roles

Every source receives one editorial role for catalogue diagnostics. Roles do
not override item-level classification: a story still has to pass the Human
Pulse or AI Wave gate.

| Role | Purpose | Examples |
| --- | --- | --- |
| `frontier` | First-party technical movement: models, research, and releases | OpenAI, DeepMind, Google AI |
| `independent-verification` | Independent reporting and explanation of scientific or technical claims | Quanta, IEEE Spectrum, AI Snake Oil |
| `human-impact` | Evidence about AI and digital systems affecting work, rights, communities, culture, and public life | Data & Society, AlgorithmWatch |
| `culture-creative` | Writers, artists, musicians, makers, and lived cultural practice | Bandcamp Daily, Literary Hub, StoryFM |

The current minimum coverage map is intentionally small. It asks for multiple
English AI perspectives, a viable Chinese AI baseline, and a durable creative
base in both languages. The map detects thin coverage; it does not force weak
sources into the public Flow merely to fill a number.

## Lifecycle

```text
coverage gap → researched public feed → candidate → probation → active
                                         │                 │
                                         └── weak evidence ─┴→ watch / paused / retired
```

1. A source is proposed only with a public, publisher-permitted RSS, Atom, or
   API-style feed. Bond6 does not scrape pages or bypass access controls.
2. It is assigned language, intended lane, coverage role, and a concrete
   reason it fills a gap.
3. It begins as a daily candidate. Candidate items never render publicly.
4. A readable first fetch moves it to probation. Source Vitality applies the
   normal 14-day, 20-usable-item and standing threshold before promotion.
5. A source can later be slowed, paused, restored, or retired with retained
   reasons and attribution history.

## First-discovery and lead-time evidence

`source_discoveries` records only a source ID, canonical item URL, original
publication timestamp when supplied, and the first time Bond6 saw it. It does
not store reader data or full articles.

This fixes a former blind spot: candidate feeds are intentionally not saved as
public stories, so a repeated item could otherwise look “new” at every poll.
The discovery record makes repeated candidate entries measurable as duplicates.

After the initial baseline fetch, Source Discovery measures:

```text
discovery lag = first_seen_at − original_published_at
```

It uses only plausible non-negative lags and records daily aggregates. Lead
time has a modest weight in Source Vitality’s value score: it rewards timely
reporting but cannot compensate for poor fit, weak source text, duplication, or
technical failures. Low-frequency essays are therefore not punished merely for
being essays.

## Daily coverage audit

The regular Source Vitality job writes a compact coverage audit for each
language, lane, and role. It records:

- required, active, and trial-source counts;
- first-discovery samples and average lag for the past 30 days;
- `covered`, `thin`, or `gap` status; and
- a human-readable reason.

Run `npm run report:sources` after Wrangler login to inspect this internal
report. A `gap` creates a research task; it never causes automatic web search
or automatic addition of an unreviewed feed.

## Editorial safeguards

- A claimed scientific result is labelled as a claim until independently
  verified; source role never turns a claim into fact.
- A reputable publisher is not a lane shortcut. Quanta’s unrelated physics
  articles, for example, still need a clear AI-system and scientific-advance
  signal to enter AI Wave.
- Coverage roles are not political balance labels and are not scores of
  ideology or prestige.
- Candidate data is bounded and expires with Source Vitality’s 90-day
  evidence window.

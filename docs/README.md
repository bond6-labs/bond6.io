# Bond6 design system

These documents define Bond6's durable editorial systems. They are intentionally separate from the Worker implementation so that product decisions, thresholds, and safety principles remain reviewable as code changes.

| Document | Status | Purpose |
| --- | --- | --- |
| [Bond6 Rhythm](BOND6_RHYTHM.md) | Implemented baseline | The deterministic method that decides whether a story belongs in Human Pulse or AI Wave and whether it can become a Daily pick. |
| [Bond6 Source Vitality](SOURCE_VITALITY.md) | Approved design; not yet automated | The living source-catalogue policy: how feeds enter, earn an active place, slow down, pause, or leave. |

## Change policy

- Treat these documents as product specifications, not marketing copy.
- Change a score, threshold, or lifecycle rule in the relevant document in the same commit as its implementation.
- Record the reason, evidence, expected impact, and rollout date for material changes.
- A source's political viewpoint, publisher size, or raw posting volume must never be a positive score by itself.
- Automation may pause broken feeds. Editorial admission and retirement remain reviewable until the Source Vitality calibration has been observed in production.

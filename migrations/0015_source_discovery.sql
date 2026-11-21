-- Source Discovery closes a gap in Source Vitality: existing feeds can be
-- scored, but their shared coverage gaps and first-seen speed need durable,
-- compact evidence too. No reader identities or full article copies are kept.

CREATE TABLE source_discoveries (
  source_id TEXT NOT NULL REFERENCES source_catalogue(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  original_published_at INTEGER,
  accepted INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(source_id, url)
);
CREATE INDEX source_discoveries_recent ON source_discoveries(first_seen_at, source_id);

CREATE TABLE source_coverage_audits (
  audit_day TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('en','zh')),
  lane TEXT NOT NULL CHECK(lane IN ('human','ai')),
  coverage_role TEXT NOT NULL,
  required_sources INTEGER NOT NULL,
  active_sources INTEGER NOT NULL,
  trial_sources INTEGER NOT NULL,
  accepted_items INTEGER NOT NULL,
  average_discovery_lag_minutes INTEGER,
  status TEXT NOT NULL CHECK(status IN ('covered','thin','gap')),
  rationale TEXT NOT NULL,
  PRIMARY KEY(audit_day, language, lane, coverage_role)
);
CREATE INDEX source_coverage_audits_recent ON source_coverage_audits(audit_day, language, lane);

ALTER TABLE source_daily_observations ADD COLUMN new_items INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_daily_observations ADD COLUMN discovery_lag_total_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE source_daily_observations ADD COLUMN discovery_lag_samples INTEGER NOT NULL DEFAULT 0;

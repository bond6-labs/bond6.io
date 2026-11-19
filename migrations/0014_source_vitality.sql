-- Source Vitality: a living catalogue that keeps transport configuration,
-- operational state, daily evidence, and decision snapshots separate.
CREATE TABLE source_catalogue (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  feed_url TEXT,
  site_url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'rss',
  config TEXT NOT NULL DEFAULT '{}',
  language TEXT NOT NULL CHECK(language IN ('en','zh')),
  intended_lane TEXT CHECK(intended_lane IN ('human','ai')),
  topic TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('candidate','probation','active','watch','paused','retired')),
  tier TEXT NOT NULL DEFAULT 'standard' CHECK(tier IN ('rapid','standard','slow','candidate')),
  expected_minutes INTEGER NOT NULL DEFAULT 240,
  pinned INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL,
  review_after INTEGER,
  last_state_change INTEGER NOT NULL,
  state_reason TEXT,
  last_success_at INTEGER,
  last_new_item_at INTEGER
);
CREATE INDEX source_catalogue_due ON source_catalogue(state, expected_minutes, id);
CREATE INDEX source_catalogue_language_state ON source_catalogue(language, state, name);
CREATE INDEX source_state_next_at ON source_state(next_at, id);

CREATE TABLE source_catalogue_meta (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE source_daily_observations (
  source_id TEXT NOT NULL REFERENCES source_catalogue(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  checks INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  raw_items INTEGER NOT NULL DEFAULT 0,
  usable_items INTEGER NOT NULL DEFAULT 0,
  accepted_items INTEGER NOT NULL DEFAULT 0,
  duplicate_items INTEGER NOT NULL DEFAULT 0,
  rejection_summary TEXT NOT NULL DEFAULT '{}',
  last_new_item_at INTEGER,
  PRIMARY KEY(source_id, day)
);
CREATE INDEX source_observations_day ON source_daily_observations(day, source_id);

CREATE TABLE source_evaluations (
  source_id TEXT NOT NULL REFERENCES source_catalogue(id) ON DELETE CASCADE,
  evaluated_at INTEGER NOT NULL,
  sample_start INTEGER NOT NULL,
  sample_end INTEGER NOT NULL,
  vitality_score REAL NOT NULL,
  value_score REAL NOT NULL,
  standing REAL NOT NULL,
  recommendation TEXT NOT NULL,
  rationale TEXT NOT NULL,
  PRIMARY KEY(source_id, evaluated_at)
);
CREATE INDEX source_evaluations_latest ON source_evaluations(source_id, evaluated_at DESC);

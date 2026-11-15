ALTER TABLE stories ADD COLUMN source_id TEXT;
ALTER TABLE stories ADD COLUMN author TEXT;
ALTER TABLE stories ADD COLUMN original_lang TEXT;
ALTER TABLE stories ADD COLUMN content_type TEXT NOT NULL DEFAULT 'article';
ALTER TABLE stories ADD COLUMN original_published_at INTEGER;
ALTER TABLE stories ADD COLUMN discovered_at INTEGER;
ALTER TABLE stories ADD COLUMN canonical_url TEXT;
ALTER TABLE stories ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
ALTER TABLE stories ADD COLUMN parent_context TEXT;
ALTER TABLE stories ADD COLUMN lane TEXT;
ALTER TABLE stories ADD COLUMN subject TEXT;
ALTER TABLE stories ADD COLUMN title_en TEXT;
ALTER TABLE stories ADD COLUMN content_hash TEXT;
ALTER TABLE stories ADD COLUMN updated_at INTEGER;
-- Legacy timestamps are deliberately not promoted to publication dates.
-- Re-polling establishes provenance; the old worker remains compatible.
UPDATE source_state SET etag = NULL, modified = NULL, next_at = 0;
CREATE INDEX stories_lane_discovery ON stories(lane, discovered_at DESC, url DESC);
CREATE INDEX stories_subject_discovery ON stories(subject, discovered_at DESC);
CREATE INDEX stories_canonical ON stories(canonical_url);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  payload TEXT NOT NULL DEFAULT '{}', next_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, updated_at INTEGER NOT NULL
);
CREATE INDEX jobs_due ON jobs(status, next_at, lease_until);
CREATE TABLE editions (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('daily', 'bond')),
  edition_date TEXT NOT NULL, published_at INTEGER NOT NULL,
  snapshot TEXT NOT NULL, correction TEXT,
  UNIQUE(kind, edition_date)
);
CREATE INDEX editions_latest ON editions(kind, edition_date DESC);
CREATE TABLE edition_stories (
  edition_id TEXT NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  url TEXT NOT NULL, publisher TEXT NOT NULL, author TEXT,
  PRIMARY KEY (edition_id, url)
);
CREATE INDEX edition_stories_url ON edition_stories(url);
CREATE TABLE generated_notes (
  content_hash TEXT PRIMARY KEY, story_url TEXT NOT NULL,
  output TEXT NOT NULL, validated_at INTEGER NOT NULL, evidence TEXT NOT NULL
);
CREATE TABLE ai_usage (
  day TEXT PRIMARY KEY, neurons REAL NOT NULL DEFAULT 0,
  calls INTEGER NOT NULL DEFAULT 0, failures INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE ai_reservations (
  id TEXT PRIMARY KEY, day TEXT NOT NULL, purpose TEXT NOT NULL,
  reserved REAL NOT NULL, actual REAL, created_at INTEGER NOT NULL
);
CREATE TABLE metrics (
  day TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day, event)
);

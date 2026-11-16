CREATE TABLE rhythm_audits (
  edition_date TEXT PRIMARY KEY,
  rhythm_version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX rhythm_audits_updated ON rhythm_audits(updated_at DESC);

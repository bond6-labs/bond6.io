CREATE TABLE bond_routes (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK(language IN ('en','zh')),
  created_at INTEGER NOT NULL,
  snapshot TEXT NOT NULL
);
CREATE INDEX bond_routes_recent ON bond_routes(language,created_at DESC);
